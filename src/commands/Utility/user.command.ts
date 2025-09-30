import {
	SlashCommandBuilder,
	ChatInputCommandInteraction,
	Message,
} from 'discord.js';
import { Command } from '../../handlers/types/command';

const userCommand: Command = {
	name: 'user',
	description: 'Provides info about a user',
	data: new SlashCommandBuilder()
		.setName('user')
		.setDescription('Info about a user')
		.addUserOption((option) =>
			option.setName('target').setDescription('The user to look up')
		),
	executeSlash: async (interaction: ChatInputCommandInteraction) => {
		const target = interaction.options.getUser('target') || interaction.user;
		const member = await interaction.guild?.members.fetch(target.id);

		await interaction.reply(
			`👤 User: **${target.tag}**\n🆔 ID: ${target.id}\n📅 Joined: ${member?.joinedAt}`
		);
	},
	executeText: async (message: Message, args: string[]) => {
		const target =
			message.mentions.users.first() ||
			(await message.client.users.fetch(args[0]).catch(() => null)) ||
			message.author;
		const member = await message.guild?.members.fetch(target.id);

		await message.reply(
			`👤 User: **${target.tag}**\n🆔 ID: ${target.id}\n📅 Joined: ${member?.joinedAt}`
		);
	},
};

export default userCommand;
