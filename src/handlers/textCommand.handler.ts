import { Events, Message, EmbedBuilder } from 'discord.js';
import { Handler } from '..';
import { textCommands } from '../commands/_commands';
import { checkPermissions, sendNoPermission } from './permissions.handler';

const PREFIX = '!';

const textCommandHandler: Handler = ({ client }) => {
	client.on(Events.MessageCreate, async (message: Message) => {
		if (!message.content.startsWith(PREFIX) || message.author.bot) return;

		const args = message.content.slice(PREFIX.length).trim().split(/ +/);
		const commandName = args.shift()?.toLowerCase();

		// Find the matching command
		const command = textCommands.find(
			(cmd) => cmd.name.toLowerCase() === commandName
		);
		if (!command) return;

		// 🔒 Permission check
		if (command.requiredPermissions) {
			const hasPerms = await checkPermissions(
				message,
				command.requiredPermissions
			);
			if (!hasPerms) {
				await sendNoPermission(message);
				return;
			}
		}

		// Execute command
		try {
			await command.execute(message, args);
		} catch (error) {
			console.error(error);
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
