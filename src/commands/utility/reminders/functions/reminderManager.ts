import { Message } from 'discord.js';

interface Reminder {
	message: string;
	timeout: NodeJS.Timeout;
	createdAt: number;
	expiresAt: number;
}

const reminders: Map<string, Reminder[]> = new Map();

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
	callback: (text: string) => Promise<void> | void
): Promise<void> {
	const ms = parseDuration(timeStr);
	if (!ms) throw new Error('Invalid time format.');

	const expiresAt = Date.now() + ms;
	const reminder: Reminder = {
		message,
		createdAt: Date.now(),
		expiresAt,
		timeout: setTimeout(async () => {
			await callback(`⏰ Reminder: ${message || 'No message provided.'}`);
			deleteReminder(userId, getReminderIndex(userId, reminder));
		}, ms),
	};

	if (!reminders.has(userId)) reminders.set(userId, []);
	reminders.get(userId)!.push(reminder);
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

	// Clear the timeout so it doesn’t still fire
	clearTimeout(userReminders[index].timeout);

	// Remove reminder
	userReminders.splice(index, 1);

	// Clean up if empty
	if (userReminders.length === 0) reminders.delete(userId);

	return true;
}

/**
 * Helper: find the index of a reminder in the user's list
 */
function getReminderIndex(userId: string, reminder: Reminder): number {
	const userReminders = reminders.get(userId) || [];
	return userReminders.indexOf(reminder);
}
