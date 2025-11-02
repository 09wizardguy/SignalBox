import {
    ButtonInteraction,
    Colors,
    EmbedBuilder,
    GuildMember,
    MessageFlags,
} from 'discord.js';
import {
    getApplication,
    updateApplicationStatus,
} from '../services/applicationManager';
import { ApplicationStatus } from '../handlers/types/application';
import { whitelistPlayer } from '../services/minecraftService';

export async function handleApproveButton(interaction: ButtonInteraction) {
    // Check if user has moderator role
    const moderatorRoleId = process.env.MODERATOR_ROLE_ID;
    if (moderatorRoleId) {
        const member = interaction.member as GuildMember;
        if (!member.roles.cache.has(moderatorRoleId)) {
            await interaction.reply({
                content:
                    '❌ You do not have permission to approve applications.',
                flags: MessageFlags.Ephemeral,
            });
            return;
        }
    }

    const userId = interaction.customId.split('_')[1];
    const application = getApplication(userId);

    if (!application) {
        await interaction.reply({
            content: '❌ Application not found.',
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    if (application.status !== ApplicationStatus.PENDING) {
        await interaction.reply({
            content: '⚠️ This application has already been processed.',
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    // Defer the reply since whitelisting might take a moment
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

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

    // Attempt to whitelist the Minecraft account if valid
    let whitelistStatus = '';
    if (application.isValidMinecraftAccount && application.minecraftUsername) {
        const whitelisted = await whitelistPlayer(
            application.minecraftUsername
        );

        if (whitelisted) {
            whitelistStatus =
                '\n🎮 **Minecraft account whitelisted successfully!**';
        } else {
            whitelistStatus =
                '\n⚠️ **Failed to whitelist Minecraft account** - Please whitelist manually or check RCON configuration.';
        }
    } else {
        whitelistStatus =
            '\n⚠️ **Minecraft account not validated** - Whitelist the player manually if needed.';
    }

    // Update embed
    const updatedEmbed = EmbedBuilder.from(interaction.message.embeds[0])
        .setColor(Colors.Green)
        .setFooter({
            text: `Approved by ${interaction.user.username}${whitelistStatus}`,
        });

    await interaction.message.edit({
        embeds: [updatedEmbed],
        components: [],
    });

    // Notify user
    try {
        const user = await interaction.client.users.fetch(userId);
        let dmMessage =
            '🎉 Congratulations! Your application has been **APPROVED**!';

        if (
            application.isValidMinecraftAccount &&
            whitelistStatus.includes('successfully')
        ) {
            dmMessage += `\n\n✅ Your Minecraft account **${application.minecraftUsername}** has been whitelisted! You can now join the server.`;
        }

        await user.send(dmMessage);
    } catch (error) {
        console.error('Could not DM user:', error);
    }

    await interaction.editReply({
        content: `✅ Application approved for <@${userId}>${whitelistStatus}`,
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
                flags: MessageFlags.Ephemeral,
            });
            return;
        }
    }

    const userId = interaction.customId.split('_')[1];
    const application = getApplication(userId);

    if (!application) {
        await interaction.reply({
            content: '❌ Application not found.',
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    if (application.status !== ApplicationStatus.PENDING) {
        await interaction.reply({
            content: '⚠️ This application has already been processed.',
            flags: MessageFlags.Ephemeral,
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
        flags: MessageFlags.Ephemeral,
    });
}
