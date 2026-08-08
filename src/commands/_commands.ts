import { Command } from '../handlers/types/command';

let pingCommand;
let userCommand;
let serverCommand;
let remindmeCommand;
let remindersCommand;
let delreminderCommand;
let showApplyButtonCommand;
let listApplicationsCommand;
let strikeCommand;
let checkStrikeCommand;

try {
    pingCommand = require('./utility/ping.command').default;
} catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('Failed to load ping command:', message);
}

try {
    userCommand = require('./utility/user.command').default;
} catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('Failed to load user command:', message);
}

try {
    serverCommand = require('./utility/server.command').default;
} catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('Failed to load server command:', message);
}

try {
    remindmeCommand =
        require('./utility/reminders/commands/remindme.command').default;
} catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('Failed to load remindme command:', message);
}

try {
    remindersCommand =
        require('./utility/reminders/commands/reminders.command').default;
} catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('Failed to load reminders command:', message);
}

try {
    delreminderCommand =
        require('./utility/reminders/commands/reminderDel.command').default;
} catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('Failed to load delreminder command:', message);
}

try {
    showApplyButtonCommand =
        require('./applications/show-apply-button.command').default;
} catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('Failed to load show-apply-button command:', message);
}

try {
    listApplicationsCommand =
        require('./applications/list-applications.command').default;
} catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('Failed to load list-applications command:', message);
}

try {
    strikeCommand = require('./moderation/strike.command').default;
} catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('Failed to load strike command:', message);
}

try {
    checkStrikeCommand = require('./moderation/checkstrike.command').default;
} catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('Failed to load checkstrike command:', message);
}

const commandImports = [
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

const commands: Command[] = commandImports.filter((cmd) => {
    if (!cmd) {
        console.warn(
            'Warning: A command import is undefined. Check your command files for proper default exports.'
        );
        return false;
    }
    return true;
});

const textCommandImports = [
    userCommand,
    remindmeCommand,
    remindersCommand,
    delreminderCommand,
    strikeCommand,
    checkStrikeCommand,
];

const textCommands: Command[] = textCommandImports.filter((cmd) => {
    if (!cmd) {
        console.warn('Warning: A text command import is undefined.');
        return false;
    }
    return true;
});

export default commands;
export { textCommands };
