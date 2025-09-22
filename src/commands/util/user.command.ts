import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { Command } from '../../handlers/command.handler'; // adjust path if needed

const userCommand: Command = {
	data: new SlashCommandBuilder()
		.setName('user')
		.setDescription('Provides information about the user.'),
	async execute(interaction: ChatInputCommandInteraction) {
		const member = interaction.member;
		const user = interaction.user;

		// Safety check: ensure member is a GuildMember (interaction.member can be GuildMember | APIUser)
		if (!interaction.guild || !member || !('joinedAt' in member)) {
			await interaction.reply('This command can only be used in a server.');
			return;
		}

		await interaction.reply(
			`This command was run by ${user.username}, who joined on ${member.joinedAt}.`
		);
	},
};

export default userCommand;
