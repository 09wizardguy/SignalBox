import { Events, Message, EmbedBuilder } from 'discord.js';
import { Handler } from '..';
import { textCommands } from '../commands/_commands';
import {
	checkPermissions,
	checkRoles,
	sendNoPermission,
	sendNoRole,
} from './permissions.handler';
import { Command } from '../handlers/types/command';

const PREFIX = '!';

const textCommandHandler: Handler = ({ client }) => {
	client.on(Events.MessageCreate, async (message: Message) => {
		if (!message.content.startsWith(PREFIX) || message.author.bot) return;

		const args = message.content.slice(PREFIX.length).trim().split(/ +/);
		const commandName = args.shift()?.toLowerCase();
		if (!commandName) return;

		// Safety check: filter out invalid commands
		const validCommands = textCommands.filter((cmd) => cmd && cmd.name);

		const command: Command | undefined = validCommands.find(
			(cmd) => cmd.name.toLowerCase() === commandName
		);

		if (!command || !command.executeText) return;

		// Role check
		if (command.requiredRoles && command.requiredRoles.length > 0) {
			const hasRoles = await checkRoles(message, command.requiredRoles);
			if (!hasRoles) {
				return;
			}
		}

		// Permission check
		if (command.requiredPermissions) {
			const hasPerms = await checkPermissions(
				message,
				command.requiredPermissions
			);
			if (!hasPerms) {
				return;
			}
		}

		// Execute command safely
		try {
			await command.executeText(message, args);
		} catch (error) {
			console.error(`Error executing text command ${command.name}:`, error);
			await message.channel.send({
				embeds: [
					new EmbedBuilder()
						.setTitle('Error')
						.setDescription('There was an error executing that command.'),
				],
			});
		}
	});
};

export default textCommandHandler;
