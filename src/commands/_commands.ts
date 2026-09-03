import { Command } from '../handlers/types/command';

import pingCommand from './utility/ping.command';
import userCommand from './utility/user.command';
import serverCommand from './utility/server.command';
import helpCommand from './utility/help.command';

import remindmeCommand from './utility/reminders/commands/remindme.command';
import remindersCommand from './utility/reminders/commands/reminders.command';
import delreminderCommand from './utility/reminders/commands/reminderDel.command';

import showApplyButtonCommand from './applications/show-apply-button.command';
import listApplicationsCommand from './applications/list-applications.command';

import strikeCommand from './moderation/strike.command';
import checkStrikeCommand from './moderation/checkstrike.command';

const commandImports: (Command | undefined)[] = [
    pingCommand,
    userCommand,
    serverCommand,
    helpCommand,
    remindmeCommand,
    remindersCommand,
    delreminderCommand,
    showApplyButtonCommand,
    listApplicationsCommand,
    strikeCommand,
    checkStrikeCommand,
];

const commands: Command[] = commandImports.filter((cmd): cmd is Command => {
    if (!cmd) {
        console.warn(
            'Warning: A command import is undefined. Check your command files for proper default exports.'
        );
        return false;
    }

    return true;
});

const textCommandImports: (Command | undefined)[] = [
    userCommand,
    helpCommand,
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
