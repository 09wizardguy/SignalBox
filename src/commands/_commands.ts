import { Command } from '../handlers/types/command';

import pingCommand from './utility/ping.command.js';
import userCommand from './utility/user.command.js';
import serverCommand from './utility/server.command.js';

import remindmeCommand from './utility/reminders/commands/remindme.command.js';
import remindersCommand from './utility/reminders/commands/reminders.command.js';
import delreminderCommand from './utility/reminders/commands/reminderDel.command.js';

import showApplyButtonCommand from './applications/show-apply-button.command.js';
import listApplicationsCommand from './applications/list-applications.command.js';

import strikeCommand from './moderation/strike.command.js';
import checkStrikeCommand from './moderation/checkstrike.command.js';

const commandImports: (Command | undefined)[] = [
    pingCommand,
    userCommand,
    serverCommand,
    remindmeCommand,
    remindersCommand,
    delreminderCommand,
    showApplyButtonCommand,
    listApplicationsCommand,
    strikeCommand,
    checkStrikeCommand,
];

const commands: Command[] = commandImports.filter(
    (cmd): cmd is Command => {
        if (!cmd) {
            console.warn(
                'Warning: A command import is undefined. Check your command files for proper default exports.'
            );
            return false;
        }

        return true;
    }
);

const textCommandImports: (Command | undefined)[] = [
    userCommand,
    remindmeCommand,
    remindersCommand,
    delreminderCommand,
    strikeCommand,
    checkStrikeCommand,
];

const textCommands: Command[] = textCommandImports.filter(
    (cmd): cmd is Command => {
        if (!cmd) {
            console.warn('Warning: A text command import is undefined.');
            return false;
        }

        return true;
    }
);

export default commands;
export { textCommands };
