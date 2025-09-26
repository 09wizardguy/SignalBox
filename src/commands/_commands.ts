import { Command } from '../handlers/command.handler';
import  pingCommand  from './utility/ping.command';
import  serverCommand  from './utility/server.command';
import  userCommand from './utility/user.command';

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