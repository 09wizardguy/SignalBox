import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    PermissionFlagsBits,
    EmbedBuilder,
    Colors,
    MessageFlags,
    TextChannel,
} from 'discord.js';
import { Command } from '../../handlers/types/command';
import {
    getApplication,
    revokeApplication,
} from '../../services/applicationManager';
import { ApplicationStatus } from '../../handlers/types/application';
import { removeWhitelistPlayer } from '../../services/minecraftService';
import { APPLICATION_MANAGER_ROLE_IDS } from '../../config/roles';

const revokeApplicationCommand: Command = {
    name: 'revoke-application',
    description:
        'Revoke a previously approved application, removing the approved role and un-whitelisting the player',
    requiredRoles: APPLICATION_MANAGER_ROLE_IDS,
    data: new SlashCommandBuilder()
        .setName('revoke-application')
        .setDescription(
            'Revoke a previously approved application, removing the approved role and un-whitelisting the player'
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .addUserOption((option) =>
            option
                .setName('user')
                .setDescription(
                    'The user whose approved application should be revoked'
                )
                .setRequired(true)
        )
        .addStringOption((option) =>
            option
                .setName('reason')
                .setDescription('Reason for the revocation (optional)')
                .setRequired(false)
                .setMaxLength(1000)
        ) as SlashCommandBuilder,

    executeSlash: async (interaction: ChatInputCommandInteraction) => {
        if (!interaction.guild) {
            await interaction.reply({
                content: '❌ This command can only be used in a server.',
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        const targetUser = interaction.options.getUser('user', true);
        const reason = interaction.options.getString('reason') || undefined;

        // Look up the existing application first, so we can give a precise
        // error message without mutating anything.
        const application = getApplication(targetUser.id);

        if (!application) {
            await interaction.reply({
                content: `❌ No application found for <@${targetUser.id}>.`,
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        if (application.status !== ApplicationStatus.APPROVED) {
            await interaction.reply({
                content: `⚠️ <@${targetUser.id}>'s application is not currently **approved** (status: \`${application.status}\`), so there's nothing to revoke.`,
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        // Defer since removing the whitelist entry can take a moment.
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        // Remove the approved role, if configured.
        const approvedRoleId = process.env.APPROVED_APPLICATION_ROLE_ID;
        if (approvedRoleId) {
            const member = await interaction.guild.members
                .fetch(targetUser.id)
                .catch(() => null);
            if (member) {
                await member.roles.remove(approvedRoleId).catch(console.error);
            }
        }

        // Remove the Minecraft whitelist entry. Mirrors the same condition
        // handleApproveButton uses to decide whether it auto-whitelisted the
        // player in the first place, so we only undo whitelisting we're
        // confident happened automatically.
        let whitelistStatus = '';
        if (
            application.isValidMinecraftAccount &&
            application.minecraftUsername
        ) {
            const removed = await removeWhitelistPlayer(
                application.minecraftUsername
            );

            if (removed) {
                whitelistStatus =
                    '\n🎮 **Minecraft account removed from the whitelist.**';
            } else {
                whitelistStatus =
                    '\n⚠️ **Failed to remove Minecraft account from the whitelist** - Please remove manually or check RCON configuration.';
            }
        } else {
            whitelistStatus =
                '\n⚠️ **Minecraft account was not auto-whitelisted** - Remove the player from the whitelist manually if needed.';
        }

        // Persist the revocation.
        const revoked = await revokeApplication(
            targetUser.id,
            interaction.user.id
        );

        if (!revoked) {
            // Extremely unlikely given the checks above, but guard against a
            // race where the status changed between the check and here.
            await interaction.editReply({
                content:
                    '❌ Could not revoke this application - its status may have changed. Please try again.',
            });
            return;
        }

        // Try to update the original review-channel embed, if we can find it.
        const reviewChannelId = process.env.APPLICATION_REVIEW_CHANNEL_ID;
        if (reviewChannelId && application.messageId) {
            const reviewChannel = await interaction.client.channels
                .fetch(reviewChannelId)
                .catch(() => null);

            if (reviewChannel?.isTextBased()) {
                const originalMessage = await (
                    reviewChannel as TextChannel
                ).messages
                    .fetch(application.messageId)
                    .catch(() => null);

                if (originalMessage && originalMessage.embeds[0]) {
                    const updatedEmbed = EmbedBuilder.from(
                        originalMessage.embeds[0]
                    )
                        .setColor(Colors.Grey)
                        .setFooter({
                            text: `Revoked by ${interaction.user.username}${reason ? ` · ${reason}` : ''}`,
                        });

                    await originalMessage
                        .edit({ embeds: [updatedEmbed], components: [] })
                        .catch(console.error);
                }
            }
        }

        // Notify the applicant via DM.
        try {
            const reasonLine = reason ? `\n\n**Reason:** ${reason}` : '';
            const cooldownEnd = Math.floor(
                (Date.now() + 2 * 24 * 60 * 60 * 1000) / 1000
            );
            await targetUser.send(
                `⚠️ Your previously **approved** application has been **revoked**.${reasonLine}\n\nYou have been removed from the whitelist.\nYou may reapply <t:${cooldownEnd}:R> (on <t:${cooldownEnd}:F>). Please contact a moderator if you have questions.`
            );
        } catch (error) {
            console.error('Could not DM user:', error);
        }

        await interaction.editReply({
            content: `✅ Application revoked for <@${targetUser.id}>${reason ? `\n**Reason:** ${reason}` : ''}${whitelistStatus}`,
        });
    },
};

export default revokeApplicationCommand;
