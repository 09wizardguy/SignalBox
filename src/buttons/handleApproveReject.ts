import {
    ButtonInteraction,
    Colors,
    EmbedBuilder,
    MessageFlags,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalSubmitInteraction,
} from 'discord.js';
import {
    getApplication,
    updateApplicationStatus,
} from '../services/applicationManager';
import { ApplicationStatus } from '../handlers/types/application';
import { whitelistPlayer } from '../services/minecraftService';
import { APPLICATION_MANAGER_ROLE_IDS } from '../config/roles';
import { checkRoles } from '../handlers/permissions.handler';

export async function handleApproveButton(interaction: ButtonInteraction) {
    // Must hold one of the same roles required to post the apply button
    // and list applications (APPLICATION_MANAGER_ROLE_IDS).
    const hasRole = await checkRoles(interaction, APPLICATION_MANAGER_ROLE_IDS);
    if (!hasRole) {
        await interaction.reply({
            content: '❌ You do not have permission to approve applications.',
            flags: MessageFlags.Ephemeral,
        });
        return;
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
    await updateApplicationStatus(userId, ApplicationStatus.APPROVED);

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
    let whitelistFailed = false;
    if (application.isValidMinecraftAccount && application.minecraftUsername) {
        const whitelisted = await whitelistPlayer(
            application.minecraftUsername
        );

        if (whitelisted) {
            whitelistStatus =
                '\n🎮 **Minecraft account whitelisted successfully!**';
        } else {
            whitelistStatus =
                '\n⚠️ **Failed to whitelist Minecraft account** - Use the button below to retry, or whitelist manually.';
            whitelistFailed = true;
        }
    } else {
        whitelistStatus =
            '\n⚠️ **Minecraft account not validated** - Whitelist the player manually if needed.';
    }

    // If the automatic whitelist attempt failed, give moderators a one-click
    // retry button on the review-channel embed instead of making them run
    // the whitelist command by hand.
    const components = whitelistFailed
        ? [
              new ActionRowBuilder<ButtonBuilder>().addComponents(
                  new ButtonBuilder()
                      .setCustomId(`retry_whitelist_${userId}`)
                      .setLabel('Retry Whitelist')
                      .setEmoji('🔁')
                      .setStyle(ButtonStyle.Primary)
              ),
          ]
        : [];

    // Update embed
    const updatedEmbed = EmbedBuilder.from(interaction.message.embeds[0])
        .setColor(Colors.Green)
        .setFooter({
            text: `Approved by ${interaction.user.username}${whitelistStatus}`,
        });

    await interaction.message.edit({
        embeds: [updatedEmbed],
        components,
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
    // Must hold one of the same roles required to post the apply button
    // and list applications (APPLICATION_MANAGER_ROLE_IDS).
    const hasRole = await checkRoles(interaction, APPLICATION_MANAGER_ROLE_IDS);
    if (!hasRole) {
        await interaction.reply({
            content: '❌ You do not have permission to reject applications.',
            flags: MessageFlags.Ephemeral,
        });
        return;
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

    // Show modal so moderator can optionally provide a reason
    const modal = new ModalBuilder()
        .setCustomId(`reject_modal_${userId}`)
        .setTitle('Reject Application');

    const reasonInput = new TextInputBuilder()
        .setCustomId('reject_reason')
        .setLabel('Reason for rejection (optional)')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Leave blank to send no reason to the applicant.')
        .setRequired(false)
        .setMaxLength(1000);

    modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(reasonInput)
    );

    await interaction.showModal(modal);
}

export async function handleRejectModalSubmit(
    interaction: ModalSubmitInteraction
) {
    // Re-check here rather than relying solely on the check in
    // handleRejectButton, since this is a separate interaction and
    // shouldn't implicitly trust that the modal could only have been
    // opened by an authorized user.
    const hasRole = await checkRoles(interaction, APPLICATION_MANAGER_ROLE_IDS);
    if (!hasRole) {
        await interaction.reply({
            content: '❌ You do not have permission to reject applications.',
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    const userId = interaction.customId.replace('reject_modal_', '');
    const reason = interaction.fields.getTextInputValue('reject_reason').trim();

    const application = getApplication(userId);

    if (!application) {
        await interaction.reply({
            content: '❌ Application not found.',
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    // Update status
    await updateApplicationStatus(userId, ApplicationStatus.REJECTED);

    // Update the original embed in the review channel
    const updatedEmbed = EmbedBuilder.from(interaction.message!.embeds[0])
        .setColor(Colors.Red)
        .setFooter({
            text: `Rejected by ${interaction.user.username}${reason ? ` · ${reason}` : ''}`,
        });

    await interaction.message!.edit({
        embeds: [updatedEmbed],
        components: [],
    });

    // Notify applicant via DM
    try {
        const user = await interaction.client.users.fetch(userId);
        const cooldownEnd = Math.floor(
            (Date.now() + 2 * 24 * 60 * 60 * 1000) / 1000
        );
        const reasonLine = reason ? `\n\n**Reason:** ${reason}` : '';
        await user.send(
            `❌ Unfortunately, your application has been **REJECTED**.${reasonLine}\n\nYou may reapply <t:${cooldownEnd}:R> (on <t:${cooldownEnd}:F>). If you have questions, please contact a moderator.`
        );
    } catch (error) {
        console.error('Could not DM user:', error);
    }

    await interaction.reply({
        content: `❌ Application rejected for <@${userId}>${reason ? `\n**Reason:** ${reason}` : ''}`,
        flags: MessageFlags.Ephemeral,
    });
}

export async function handleRetryWhitelistButton(
    interaction: ButtonInteraction
) {
    // Same role gate as approve/reject - only application managers can
    // retry whitelisting.
    const hasRole = await checkRoles(interaction, APPLICATION_MANAGER_ROLE_IDS);
    if (!hasRole) {
        await interaction.reply({
            content: '❌ You do not have permission to manage the whitelist.',
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    const userId = interaction.customId.replace('retry_whitelist_', '');
    const application = getApplication(userId);

    if (!application) {
        await interaction.reply({
            content: '❌ Application not found.',
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    // Only approved applications should ever be whitelisted. If the
    // application has since been rejected or revoked, the retry button is
    // stale - don't act on it.
    if (application.status !== ApplicationStatus.APPROVED) {
        await interaction.reply({
            content: `⚠️ This application is no longer approved (status: \`${application.status}\`), so it can't be whitelisted.`,
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    if (
        !application.isValidMinecraftAccount ||
        !application.minecraftUsername
    ) {
        await interaction.reply({
            content:
                '❌ This application has no validated Minecraft account to whitelist.',
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    // Defer since RCON round-trips can take a moment.
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const whitelisted = await whitelistPlayer(application.minecraftUsername);

    if (whitelisted) {
        // Success - drop the retry button and update the footer so it's
        // clear on the review-channel message that this got resolved.
        const updatedEmbed = EmbedBuilder.from(interaction.message.embeds[0])
            .setColor(Colors.Green)
            .setFooter({
                text: `Approved · Minecraft account whitelisted (retried by ${interaction.user.username})`,
            });

        await interaction.message.edit({
            embeds: [updatedEmbed],
            components: [],
        });

        try {
            const user = await interaction.client.users.fetch(userId);
            await user.send(
                `✅ Your Minecraft account **${application.minecraftUsername}** has been whitelisted! You can now join the server.`
            );
        } catch (error) {
            console.error('Could not DM user:', error);
        }

        await interaction.editReply({
            content: `✅ **${application.minecraftUsername}** has been whitelisted.`,
        });
    } else {
        // Still failing - leave the button in place so a moderator can try
        // again once the underlying issue (RCON connectivity, etc.) is
        // resolved.
        await interaction.editReply({
            content: `❌ Still failed to whitelist **${application.minecraftUsername}**. Check the RCON configuration and try again, or whitelist manually.`,
        });
    }
}
