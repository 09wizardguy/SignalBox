import {
    ButtonInteraction,
    Colors,
    EmbedBuilder,
    GuildMember,
} from 'discord.js';
import {
    getApplication,
    updateApplicationStatus,
} from '../services/applicationManager';
import { ApplicationStatus } from '../handlers/types/application';

export async function handleApproveButton(interaction: ButtonInteraction) {
    // Check if user has moderator role
    const moderatorRoleId = process.env.MODERATOR_ROLE_ID;
    if (moderatorRoleId) {
        const member = interaction.member as GuildMember;
        if (!member.roles.cache.has(moderatorRoleId)) {
            await interaction.reply({
                content:
                    '❌ You do not have permission to approve applications.',
                ephemeral: true,
            });
            return;
        }
    }

    const userId = interaction.customId.split('_')[1];
    const application = getApplication(userId);

    if (!application) {
        await interaction.reply({
            content: '❌ Application not found.',
            ephemeral: true,
        });
        return;
    }

    if (application.status !== ApplicationStatus.PENDING) {
        await interaction.reply({
            content: '⚠️ This application has already been processed.',
            ephemeral: true,
        });
        return;
    }

    // Update status
    updateApplicationStatus(userId, ApplicationStatus.APPROVED);

    // Add role if configured
    const approvedRoleId = process.env.APPROVED_APPLICATION_ROLE_ID;
    if (approvedRoleId && interaction.guild) {
        const member = await interaction.guild.members
            .fetch(userId)
            .catch(() => null);
        if (member) {
            await member.roles.add(approvedRoleId).catch(console.error);
        }
    }

    // Update embed
    const updatedEmbed = EmbedBuilder.from(interaction.message.embeds[0])
        .setColor(Colors.Green)
        .setFooter({ text: `Approved by ${interaction.user.username}` });

    await interaction.update({
        embeds: [updatedEmbed],
        components: [],
    });

    // Notify user
    try {
        const user = await interaction.client.users.fetch(userId);
        await user.send(
            '🎉 Congratulations! Your application has been **APPROVED**!'
        );
    } catch (error) {
        console.error('Could not DM user:', error);
    }

    await interaction.followUp({
        content: `✅ Application approved for <@${userId}>`,
        ephemeral: true,
    });
}

export async function handleRejectButton(interaction: ButtonInteraction) {
    // Check if user has moderator role
    const moderatorRoleId = process.env.MODERATOR_ROLE_ID;
    if (moderatorRoleId) {
        const member = interaction.member as GuildMember;
        if (!member.roles.cache.has(moderatorRoleId)) {
            await interaction.reply({
                content:
                    '❌ You do not have permission to reject applications.',
                ephemeral: true,
            });
            return;
        }
    }

    const userId = interaction.customId.split('_')[1];
    const application = getApplication(userId);

    if (!application) {
        await interaction.reply({
            content: '❌ Application not found.',
            ephemeral: true,
        });
        return;
    }

    if (application.status !== ApplicationStatus.PENDING) {
        await interaction.reply({
            content: '⚠️ This application has already been processed.',
            ephemeral: true,
        });
        return;
    }

    // Update status
    updateApplicationStatus(userId, ApplicationStatus.REJECTED);

    // Update embed
    const updatedEmbed = EmbedBuilder.from(interaction.message.embeds[0])
        .setColor(Colors.Red)
        .setFooter({ text: `Rejected by ${interaction.user.username}` });

    await interaction.update({
        embeds: [updatedEmbed],
        components: [],
    });

    // Notify user
    try {
        const user = await interaction.client.users.fetch(userId);
        await user.send(
            '❌ Unfortunately, your application has been **REJECTED**. Please contact a moderator for more information.'
        );
    } catch (error) {
        console.error('Could not DM user:', error);
    }

    await interaction.followUp({
        content: `❌ Application rejected for <@${userId}>`,
        ephemeral: true,
    });
}
