import fs from 'fs';
import path from 'path';

interface Reminder {
    message: string;
    timeout?: NodeJS.Timeout;
    createdAt: number;
    expiresAt: number;
}

interface SerializedReminder {
    message: string;
    createdAt: number;
    expiresAt: number;
}

const reminders: Map<string, Reminder[]> = new Map();
const REMINDERS_FILE = path.join(process.cwd(), 'data', 'reminders.json');

/**
 * Ensure the data directory exists
 */
function ensureDataDir() {
    const dir = path.dirname(REMINDERS_FILE);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

/**
 * Save reminders to JSON file
 */
function saveReminders() {
    try {
        ensureDataDir();
        const data: Record<string, SerializedReminder[]> = {};

        for (const [userId, userReminders] of reminders.entries()) {
            data[userId] = userReminders.map((r) => ({
                message: r.message,
                createdAt: r.createdAt,
                expiresAt: r.expiresAt,
            }));
        }

        fs.writeFileSync(REMINDERS_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error saving reminders:', error);
    }
}

/**
 * Load reminders from JSON file
 */
export function loadReminders(
    callback: (
        userId: string,
        message: string,
        createdAt: number
    ) => Promise<void> | void
) {
    try {
        ensureDataDir();

        if (!fs.existsSync(REMINDERS_FILE)) {
            console.log('No reminders file found, starting fresh.');
            return;
        }

        const fileContent = fs.readFileSync(REMINDERS_FILE, 'utf-8').trim();

        // Check if file is empty or only contains whitespace
        if (!fileContent) {
            console.log('Reminders file is empty, starting fresh.');
            // Initialize with empty object
            fs.writeFileSync(REMINDERS_FILE, '{}');
            return;
        }

        const data = JSON.parse(fileContent);
        const now = Date.now();

        for (const [userId, userReminders] of Object.entries(data)) {
            const reminderList = userReminders as SerializedReminder[];

            for (const reminder of reminderList) {
                const timeLeft = reminder.expiresAt - now;

                // Skip expired reminders
                if (timeLeft <= 0) {
                    console.log(`Skipping expired reminder for user ${userId}`);
                    continue;
                }

                // Recreate the timeout
                const reminderObj: Reminder = {
                    message: reminder.message,
                    createdAt: reminder.createdAt,
                    expiresAt: reminder.expiresAt,
                    timeout: setTimeout(async () => {
                        await callback(
                            userId,
                            reminder.message || 'No message provided.',
                            reminder.createdAt
                        );
                        deleteReminder(
                            userId,
                            getReminderIndex(userId, reminderObj)
                        );
                    }, timeLeft),
                };

                if (!reminders.has(userId)) reminders.set(userId, []);
                reminders.get(userId)!.push(reminderObj);
            }
        }

        console.log(`Loaded ${reminders.size} users with active reminders.`);
    } catch (error) {
        console.error('Error loading reminders:', error);
        console.log('Creating fresh reminders file...');
        // Reset file with empty object if corrupted
        try {
            fs.writeFileSync(REMINDERS_FILE, '{}');
        } catch (writeError) {
            console.error('Could not create fresh reminders file:', writeError);
        }
    }
}

/**
 * Parse a duration string like "1m2h3d" into milliseconds.
 */
function parseDuration(input: string): number | null {
    const regex = /(\d+)([smhdw])/g;
    let match;
    let ms = 0;

    while ((match = regex.exec(input)) !== null) {
        const value = parseInt(match[1]);
        const unit = match[2];

        switch (unit) {
            case 's':
                ms += value * 1000;
                break;
            case 'm':
                ms += value * 60 * 1000;
                break;
            case 'h':
                ms += value * 60 * 60 * 1000;
                break;
            case 'd':
                ms += value * 24 * 60 * 60 * 1000;
                break;
            case 'w':
                ms += value * 7 * 24 * 60 * 60 * 1000;
                break;
        }
    }

    return ms > 0 ? ms : null;
}

/**
 * Schedule a new reminder.
 */
export async function scheduleReminder(
    userId: string,
    timeStr: string,
    message: string,
    callback: (message: string, createdAt: number) => Promise<void> | void
): Promise<void> {
    const ms = parseDuration(timeStr);
    if (!ms) throw new Error('Invalid time format.');

    const createdAt = Date.now();
    const expiresAt = createdAt + ms;
    const reminder: Reminder = {
        message,
        createdAt,
        expiresAt,
        timeout: setTimeout(async () => {
            await callback(message || 'No message provided.', createdAt);
            deleteReminder(userId, getReminderIndex(userId, reminder));
        }, ms),
    };

    if (!reminders.has(userId)) reminders.set(userId, []);
    reminders.get(userId)!.push(reminder);

    saveReminders();
}

/**
 * List active reminders for a user.
 */
export function listReminders(
    userId: string
): { message: string; expiresAt: number }[] {
    const userReminders = reminders.get(userId) || [];
    return userReminders.map((r) => ({
        message: r.message,
        expiresAt: r.expiresAt,
    }));
}

/**
 * Delete a reminder by index.
 */
export function deleteReminder(userId: string, index: number): boolean {
    const userReminders = reminders.get(userId);
    if (!userReminders || index < 0 || index >= userReminders.length) {
        return false;
    }

    // Clear the timeout so it doesn't still fire
    if (userReminders[index].timeout) {
        clearTimeout(userReminders[index].timeout);
    }

    // Remove reminder
    userReminders.splice(index, 1);

    // Clean up if empty
    if (userReminders.length === 0) {
        reminders.delete(userId);
    }

    saveReminders();
    return true;
}

/**
 * Helper: find the index of a reminder in the user's list
 */
function getReminderIndex(userId: string, reminder: Reminder): number {
    const userReminders = reminders.get(userId) || [];
    return userReminders.indexOf(reminder);
}
