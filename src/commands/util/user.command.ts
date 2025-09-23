import {
	SlashCommandBuilder,
	ChatInputCommandInteraction,
	GuildMember,
	User,
	EmbedBuilder,
} from 'discord.js';
import { Command } from '../../handlers/command.handler';

const userCommand: Command = {
	data: new SlashCommandBuilder()
		.setName('user')
		.setDescription('Provides information about a user.')
		.addStringOption((option) =>
			option
				.setName('target')
				.setDescription('The user mention or ID to get info on')
				.setRequired(true)
		),

	async execute(interaction: ChatInputCommandInteraction) {
		if (!interaction.guild) {
			await interaction.reply('This command can only be used in a server.');
			return;
		}

		const input =
			interaction.options.getString('target') || interaction.user.id;

		const userId = input.replace(/[<@!>]/g, '');

		let targetUser: User | null = null;
		let targetMember: GuildMember | null = null;

		targetMember = interaction.guild.members.cache.get(userId) || null;

		if (targetMember) {
			targetUser = targetMember.user;
		} else {
			try {
				targetUser = await interaction.client.users.fetch(userId);
			} catch (err) {
				await interaction.reply(`Could not find a user for input: ${input}`);
				return;
			}
		}

		const accountCreated = Math.floor(targetUser.createdTimestamp / 1000);

		let joinedServer = 'Not in server';
		let roles = 'N/A';

		if (targetMember) {
			joinedServer = Math.floor(
				targetMember.joinedTimestamp! / 1000
			).toString();
			roles =
				targetMember.roles.cache
					.filter((role) => role.id !== interaction.guild!.id)
					.map((role) => role.name)
					.join(', ') || 'No roles';
		}

		const embed = new EmbedBuilder()
			.setTitle(`User Info: ${targetUser.username}`)
			.setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
			.addFields(
				{ name: 'Mention', value: `<@${targetUser.id}>`, inline: true },
				{ name: 'User ID', value: targetUser.id, inline: true },
				{
					name: 'Account Created',
					value: `<t:${accountCreated}:R>`,
					inline: true,
				},
				{
					name: 'In Server?',
					value: targetMember ? 'Yes' : 'No',
					inline: true,
				},
				{
					name: 'Joined Server',
					value: targetMember ? `<t:${joinedServer}:R>` : 'N/A',
					inline: true,
				},
				{ name: 'Roles', value: roles, inline: false }
			)
			.setColor('Blue');

		await interaction.reply({ embeds: [embed] });
	},
};

export default userCommand;
