import {
    ButtonInteraction,
    Colors,
    EmbedBuilder,
    MessageFlags,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
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
            (Date.now() + 7 * 24 * 60 * 60 * 1000) / 1000
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
