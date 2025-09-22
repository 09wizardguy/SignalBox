import { Command } from '../handlers/command.handler';
import  pingCommand  from './util/ping.command';
import  serverCommand  from './util/server.command';
import  userCommand from './util/user.command';

// export slash commands
export const commands: Command[] = [
	pingCommand,
	serverCommand,
	userCommand
];

export default commands;

// Export Text Commands
export const textCommands = [

];