import { Command } from '../handlers/types/command';
import pingCommand from './utility/ping.command';
import userCommand from './utility/user.command';
import serverCommand from './utility/server.command';
import remindmeCommand from './utility/reminders/commands/remindme.command';
import remindersCommand from './utility/reminders/commands/reminders.command';
import delreminderCommand from './utility/reminders/commands/reminderDel.command';

const commands: Command[] = [
	pingCommand,
	userCommand,
	serverCommand,
	remindmeCommand,
	remindersCommand,
	delreminderCommand,
];

export default commands;

const textCommands: Command[] = [
	userCommand,
	remindmeCommand,
	remindersCommand,
	delreminderCommand,
];

export { textCommands };