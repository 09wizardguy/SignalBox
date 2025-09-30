import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { Command } from '../../handlers/types/command';

const pingCommand: Command = {
	data: new SlashCommandBuilder()
		.setName('ping')
		.setDescription('Replies with Pong!'),

	async executeSlash(interaction: ChatInputCommandInteraction) {
		await interaction.reply('Pong!');
	},
};

export default pingCommand;
