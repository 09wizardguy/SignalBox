import { Command } from '../handlers/command.handler';
import  pingCommand  from './Utility/ping.command';
import  serverCommand  from './Utility/server.command';
import  userCommand from './Utility/user.command';

// export slash commands
export const commands: Command[] = [
	pingCommand,
	serverCommand,
	userCommand
];

export default commands;

// Export Text Commands
export const textCommands = [
	userCommand
];