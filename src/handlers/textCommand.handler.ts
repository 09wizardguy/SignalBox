import { Events, Message, EmbedBuilder } from 'discord.js';
import { Handler } from '..';
import { textCommands } from '../commands/_commands';

const textCommandHandler: Handler = ({ client }) => {
	client.on(Events.MessageCreate, async (event: Message) => {
		if (!event.content.startsWith('!')) return;

		try {
			for (const cmd of textCommands) {
				await cmd.execute(event);
			}
		} catch (error) {
			await event.channel.send({
				embeds: [
					new EmbedBuilder()
						.setTitle('Error')
						.setDescription('There was an Error executing that command.'),
				],
			});
		}
	});
};

export default textCommandHandler;
