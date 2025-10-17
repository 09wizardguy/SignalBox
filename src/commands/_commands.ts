import { Command } from '../handlers/types/command';
import pingCommand from './utility/ping.command';
import userCommand from './utility/user.command';
import serverCommand from './utility/server.command';
import remindmeCommand from './utility/reminders/commands/remindme.command';
import remindersCommand from './utility/reminders/commands/reminders.command';
import delreminderCommand from './utility/reminders/commands/reminderDel.command';
import showApplyButtonCommand from './applications/show-apply-button.command';
import listApplicationsCommand from './applications/list-applications.command';

const commands: Command[] = [
	pingCommand,
	userCommand,
	serverCommand,
	remindmeCommand,
	remindersCommand,
	delreminderCommand,
	showApplyButtonCommand,
	listApplicationsCommand,
];

export default commands;

const textCommands: Command[] = [
	userCommand,
	remindmeCommand,
	remindersCommand,
	delreminderCommand,
];

export { textCommands };
