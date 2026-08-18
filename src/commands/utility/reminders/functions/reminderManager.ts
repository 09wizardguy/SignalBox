import {
    getPersistence,
    PersistenceCollection,
} from '../../../../services/persistence';

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

/**
 * Save one user's reminders using the configured persistence provider.
 */
async function saveUserReminders(userId: string): Promise<void> {
    const userReminders = reminders.get(userId) ?? [];

    const serialized: SerializedReminder[] = userReminders.map((reminder) => ({
        message: reminder.message,
        createdAt: reminder.createdAt,
        expiresAt: reminder.expiresAt,
    }));

    if (serialized.length === 0) {
        await getPersistence().delete(PersistenceCollection.Reminders, userId);

        return;
    }

    await getPersistence().set(
        PersistenceCollection.Reminders,
        userId,
        serialized
    );
}

/**
 * Load reminders from the configured persistence provider.
 */
export async function loadReminders(
    callback: (
        userId: string,
        message: string,
        createdAt: number
    ) => Promise<void> | void
): Promise<void> {
    try {
        const entries = await getPersistence().getAllEntries<
            SerializedReminder[]
        >(PersistenceCollection.Reminders);

        const now = Date.now();

        reminders.clear();

        for (const [userId, userReminders] of entries) {
            for (const reminder of userReminders) {
                const timeLeft = reminder.expiresAt - now;

                if (timeLeft <= 0) {
                    console.log(`Skipping expired reminder for user ${userId}`);

                    continue;
                }

                const reminderObj: Reminder = {
                    message: reminder.message,
                    createdAt: reminder.createdAt,
                    expiresAt: reminder.expiresAt,
                };

                reminderObj.timeout = setTimeout(async () => {
                    try {
                        await callback(
                            userId,
                            reminder.message || 'No message provided.',
                            reminder.createdAt
                        );
                    } finally {
                        const index = getReminderIndex(userId, reminderObj);

                        if (index !== -1) {
                            await deleteReminder(userId, index);
                        }
                    }
                }, timeLeft);

                if (!reminders.has(userId)) {
                    reminders.set(userId, []);
                }

                reminders.get(userId)!.push(reminderObj);
            }
        }

        // Remove expired-only users from persistence.
        for (const [userId, userReminders] of entries) {
            const active = reminders.get(userId);

            if (userReminders.length > 0 && (!active || active.length === 0)) {
                await getPersistence().delete(
                    PersistenceCollection.Reminders,
                    userId
                );
            }
        }

        console.log(`Loaded ${reminders.size} users with active reminders.`);
    } catch (error) {
        console.error('Error loading reminders:', error);

        throw error;
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

    if (!ms) {
        throw new Error('Invalid time format.');
    }

    const createdAt = Date.now();

    const expiresAt = createdAt + ms;

    const reminder: Reminder = {
        message,
        createdAt,
        expiresAt,
    };

    reminder.timeout = setTimeout(async () => {
        try {
            await callback(message || 'No message provided.', createdAt);
        } finally {
            const index = getReminderIndex(userId, reminder);

            if (index !== -1) {
                await deleteReminder(userId, index);
            }
        }
    }, ms);

    if (!reminders.has(userId)) {
        reminders.set(userId, []);
    }

    reminders.get(userId)!.push(reminder);

    await saveUserReminders(userId);
}

/**
 * List active reminders for a user.
 */
export function listReminders(userId: string): {
    message: string;
    expiresAt: number;
}[] {
    const userReminders = reminders.get(userId) || [];

    return userReminders.map((reminder) => ({
        message: reminder.message,
        expiresAt: reminder.expiresAt,
    }));
}

/**
 * Delete a reminder by index.
 */
export async function deleteReminder(
    userId: string,
    index: number
): Promise<boolean> {
    const userReminders = reminders.get(userId);

    if (!userReminders || index < 0 || index >= userReminders.length) {
        return false;
    }

    if (userReminders[index].timeout) {
        clearTimeout(userReminders[index].timeout);
    }

    userReminders.splice(index, 1);

    if (userReminders.length === 0) {
        reminders.delete(userId);
    }

    await saveUserReminders(userId);

    return true;
}

/**
 * Helper: find the index of a reminder in the user's list.
 */
function getReminderIndex(userId: string, reminder: Reminder): number {
    const userReminders = reminders.get(userId) || [];

    return userReminders.indexOf(reminder);
}
