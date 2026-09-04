import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    PermissionFlagsBits,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    MessageFlags,
} from 'discord.js';
import { Command } from '../../handlers/types/command';
import { APPLICATION_MANAGER_ROLE_IDS } from '../../config/roles';

const showApplyButtonCommand: Command = {
    name: 'show-apply-button',
    description: 'Display the application button for users to apply',
    requiredRoles: APPLICATION_MANAGER_ROLE_IDS,
    data: new SlashCommandBuilder()
        .setName('show-apply-button')
        .setDescription('Display the application button for users to apply')
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
    executeSlash: async (interaction: ChatInputCommandInteraction) => {
        const applyButton = new ButtonBuilder()
            .setCustomId('apply')
            .setLabel('📝 Apply')
            .setStyle(ButtonStyle.Primary);

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            applyButton
        );

        const embed = new EmbedBuilder()
            .setTitle('Apply for Minecraft Server Whitelist')
            .setDescription(
                'Click the button below to submit an application to be whitelisted on the community server. You will be asked a few questions in a form.'
            )
            .setColor('#5865F2');

        if (interaction.channel?.isSendable()) {
            await interaction.channel.send({
                embeds: [embed],
                components: [row],
            });
        }

        await interaction.reply({
            content: '✅ Application button posted!',
            flags: MessageFlags.Ephemeral,
        });
    },
};

export default showApplyButtonCommand;
