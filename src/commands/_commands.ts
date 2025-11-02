import { Command } from '../handlers/types/command';

// Use dynamic imports with error handling to identify which command is failing
let pingCommand;
let userCommand;
let serverCommand;
let remindmeCommand;
let remindersCommand;
let delreminderCommand;
let showApplyButtonCommand;
let listApplicationsCommand;

try {
    pingCommand = require('./utility/ping.command').default;
} catch (e) {
    console.error('Failed to load ping command:', e.message);
}

try {
    userCommand = require('./utility/user.command').default;
} catch (e) {
    console.error('Failed to load user command:', e.message);
}

try {
    serverCommand = require('./utility/server.command').default;
} catch (e) {
    console.error('Failed to load server command:', e.message);
}

try {
    remindmeCommand =
        require('./utility/reminders/commands/remindme.command').default;
} catch (e) {
    console.error('Failed to load remindme command:', e.message);
}

try {
    remindersCommand =
        require('./utility/reminders/commands/reminders.command').default;
} catch (e) {
    console.error('Failed to load reminders command:', e.message);
}

try {
    delreminderCommand =
        require('./utility/reminders/commands/reminderDel.command').default;
} catch (e) {
    console.error('Failed to load delreminder command:', e.message);
}

try {
    showApplyButtonCommand =
        require('./applications/show-apply-button.command').default;
} catch (e) {
    console.error('Failed to load show-apply-button command:', e.message);
}

try {
    listApplicationsCommand =
        require('./applications/list-applications.command').default;
} catch (e) {
    console.error('Failed to load list-applications command:', e.message);
}

// Filter out any undefined imports and log warnings
const commandImports = [
    pingCommand,
    userCommand,
    serverCommand,
    remindmeCommand,
    remindersCommand,
    delreminderCommand,
    showApplyButtonCommand,
    listApplicationsCommand,
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
