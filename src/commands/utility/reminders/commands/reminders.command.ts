import {
	SlashCommandBuilder,
	ChatInputCommandInteraction,
	Message,
} from 'discord.js';
import { Command } from '../../../../handlers/types/command';
import { listReminders } from '../functions/reminderManager';

const remindersCommand: Command = {
	name: 'reminders',
	description: 'View your active reminders',
	requiredRoles: [process.env.BASIC_COMMANDS_ROLE_ID!],
	data: new SlashCommandBuilder()
		.setName('reminders')
		.setDescription('List your active reminders'),
	executeSlash: async (interaction: ChatInputCommandInteraction) => {
		const active = listReminders(interaction.user.id);
		if (active.length === 0) {
			await interaction.reply('✅ You have no active reminders.');
			return;
		}

		await interaction.reply(
			`📋 Your reminders:\n${active
				.map(
					(r, i) =>
						`${i + 1}. ${r.message || '(no message)'} - <t:${Math.floor(
							r.expiresAt / 1000
						)}:R>`
				)
				.join('\n')}`
		);
	},
	executeText: async (message: Message) => {
		const active = listReminders(message.author.id);
		if (active.length === 0) {
			await message.channel.send('✅ You have no active reminders.');
			return;
		}

		await message.channel.send(
			`📋 Your reminders:\n${active
				.map(
					(r, i) =>
						`${i + 1}. ${r.message || '(no message)'} - <t:${Math.floor(
							r.expiresAt / 1000
						)}:R>`
				)
				.join('\n')}`
		);
	},
};

export default remindersCommand;
