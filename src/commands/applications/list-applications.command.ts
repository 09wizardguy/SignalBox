import {
	SlashCommandBuilder,
	ChatInputCommandInteraction,
	PermissionFlagsBits,
	EmbedBuilder,
} from 'discord.js';
import { Command } from '../../handlers/types/command';
import { getAllApplications } from '../../services/applicationManager';
import { ApplicationStatus } from '../../handlers/types/application';

const listApplicationsCommand: Command = {
	name: 'list-applications',
	description: 'List all applications with optional status filter',
	requiredRoles: [process.env.MODERATOR_ROLE_ID!],
	data: new SlashCommandBuilder()
		.setName('list-applications')
		.setDescription('List all applications with optional status filter')
		.setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
		.addStringOption((option) =>
			option
				.setName('status')
				.setDescription('Filter by status')
				.addChoices(
					{ name: 'Pending', value: ApplicationStatus.PENDING },
					{ name: 'Approved', value: ApplicationStatus.APPROVED },
					{ name: 'Rejected', value: ApplicationStatus.REJECTED }
				)
		),
	executeSlash: async (interaction: ChatInputCommandInteraction) => {
		const statusFilter = interaction.options.getString(
			'status'
		) as ApplicationStatus | null;

		const applications = getAllApplications(statusFilter || undefined);

		if (applications.length === 0) {
			await interaction.reply({
				content: statusFilter
					? `No applications found with status: ${statusFilter}`
					: 'No applications found.',
				ephemeral: true,
			});
			return;
		}

		const embed = new EmbedBuilder()
			.setTitle(
				statusFilter
					? `${statusFilter.toUpperCase()} Applications`
					: 'All Applications'
			)
			.setColor('#5865F2')
			.setDescription(`Total: ${applications.length} application(s)`)
			.setTimestamp();

		// Add fields for each application
		for (const app of applications.slice(0, 25)) {
			// Discord limit of 25 fields
			const user = await interaction.client.users
				.fetch(app.userId)
				.catch(() => null);
			const fieldValue = [
				`**User:** ${user ? user.tag : 'Unknown'} (<@${app.userId}>)`,
				`**Status:** ${app.status}`,
				`**Minecraft Username:** ${app.minecraftUsername}`,
				`**Reason:** ${app.reason?.substring(0, 100) || 'Not provided'}`,
				`**Likes Trains:** ${app.likeTrains || 'Not answered'}`,
				`**Applied:** <t:${Math.floor(app.createdAt / 1000)}:R>`,
			].join('\n');

			embed.addFields({
				name: `Application #${app.userId.slice(-4)}`,
				value: fieldValue,
				inline: false,
			});
		}

		if (applications.length > 25) {
			embed.setFooter({
				text: `Showing first 25 of ${applications.length} applications`,
			});
		}

		await interaction.reply({ embeds: [embed], ephemeral: true });
	},
};

export default listApplicationsCommand;
