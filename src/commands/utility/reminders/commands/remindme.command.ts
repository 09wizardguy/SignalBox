import {
	SlashCommandBuilder,
	ChatInputCommandInteraction,
	Message,
} from 'discord.js';
import { Command } from '../../../../handlers/types/command'; 
import { scheduleReminder } from '../functions/reminderManager';

const remindmeCommand: Command = {
	name: 'remindme',
	description: 'Set a reminder',
	data: new SlashCommandBuilder()
		.setName('remindme')
		.setDescription('Set a reminder')
		.addStringOption((opt) =>
			opt
				.setName('time')
				.setDescription('Time (1m, 2h, 3d, 1w)')
				.setRequired(true)
		)
		.addStringOption((opt) =>
			opt.setName('message').setDescription('Reminder text').setRequired(false)
		),
	executeSlash: async (interaction: ChatInputCommandInteraction) => {
		const time = interaction.options.getString('time', true);
		const msg = interaction.options.getString('message') || '';
		await scheduleReminder(interaction.user.id, time, msg, async (text) =>
			await interaction.followUp(text)
		);

		await interaction.followUp(`⏰ Reminder set for **${time}**`);
	},
	executeText: async (message: Message, args: string[]) => {
		const [time, ...reminderMessage] = args;
		if (!time) {
			await message.reply('Usage: !remindme <time> <message?>');
			return;
		}
		const msg = reminderMessage.join(' ');

		await scheduleReminder(message.author.id, time, msg, (text) =>
			message.channel.send(`${message.author} ${text}`)
		);

		await message.reply(`⏰ Reminder set for **${time}**`);
	},
};

export default remindmeCommand;
