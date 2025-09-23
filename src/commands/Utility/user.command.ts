import {
	SlashCommandBuilder,
	ChatInputCommandInteraction,
	GuildMember,
	User,
	EmbedBuilder,
	Message,
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

	// Slash command execution
	async execute(interaction: ChatInputCommandInteraction | Message) {
		let guild =
			interaction instanceof Message ? interaction.guild : interaction.guild;
		if (!guild) {
			if (interaction instanceof ChatInputCommandInteraction)
				await interaction.reply('This command can only be used in a server.');
			else interaction.reply('This command can only be used in a server.');
			return;
		}

		// Determine the target user ID
		let input: string;
		if (interaction instanceof ChatInputCommandInteraction) {
			input = interaction.options.getString('target') || interaction.user.id;
		} else {
			// For text commands, parse message content: "!user [userID or mention]"
			const args = interaction.content.trim().split(/ +/).slice(1);
			input = args[0] || interaction.author.id;
		}

		const userId = input.replace(/[<@!>]/g, '');

		let targetUser: User | null = null;
		let targetMember: GuildMember | null = null;

		// Try to get member from guild cache
		targetMember = guild.members.cache.get(userId) || null;

		if (targetMember) {
			targetUser = targetMember.user;
		} else {
			// Fetch user from API
			try {
				targetUser = await (interaction instanceof Message
					? interaction.client.users.fetch(userId)
					: interaction.client.users.fetch(userId));
			} catch (err) {
				const replyContent = `Could not find a user for input: ${input}`;
				if (interaction instanceof ChatInputCommandInteraction)
					await interaction.reply(replyContent);
				else interaction.reply(replyContent);
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
					.filter((role) => role.id !== guild.id)
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

		if (interaction instanceof ChatInputCommandInteraction) {
			await interaction.reply({ embeds: [embed] });
		} else {
			await interaction.channel.send({ embeds: [embed] });
		}
	},
};

export default userCommand;
