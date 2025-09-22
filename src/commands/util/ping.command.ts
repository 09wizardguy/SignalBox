import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';

const pingCommand = {
	data: new SlashCommandBuilder()
		.setName('ping')
		.setDescription('Replies with Pong!'),
	async execute(interaction: ChatInputCommandInteraction) {
		await interaction.reply('Pong!');
	},
};

export default pingCommand;
