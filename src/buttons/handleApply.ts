import {
    ButtonInteraction,
    MessageFlags,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    Colors,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    StringSelectMenuBuilder,
    StringSelectMenuInteraction,
} from 'discord.js';
import {
    createApplication,
    getApplication,
    updateApplicationMessageId,
} from '../services/applicationManager';
import { ApplicationStatus } from '../handlers/types/application';
import {
    validateMinecraftUsername,
    formatUUID,
} from '../services/minecraftService';

type PendingApplicationData = {
    minecraftUsername: string;
    minecraftUUID?: string;
    isValidMinecraftAccount: boolean;
    reason?: string;
    experience?: string;
};

declare global {
    var pendingApplications: Map<string, PendingApplicationData> | undefined;
}

export async function handleApplyButton(interaction: ButtonInteraction) {
    // Check if user already has an application
    const existingApp = getApplication(interaction.user.id);

    if (existingApp) {
        if (existingApp.status === ApplicationStatus.PENDING) {
            await interaction.reply({
                content: '⚠️ You already have a pending application!',
                flags: MessageFlags.Ephemeral,
            });
            return;
        } else if (existingApp.status === ApplicationStatus.APPROVED) {
            await interaction.reply({
                content: '✅ Your application has already been approved!',
                flags: MessageFlags.Ephemeral,
            });
            return;
        } else if (existingApp.status === ApplicationStatus.REJECTED) {
            const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;
            const rejectedAt = existingApp.rejectedAt ?? existingApp.createdAt;
            const elapsed = Date.now() - rejectedAt;

            if (elapsed < COOLDOWN_MS) {
                const reopensAt = Math.floor((rejectedAt + COOLDOWN_MS) / 1000);
                await interaction.reply({
                    content: `❌ Your previous application was rejected. You can reapply <t:${reopensAt}:R> (on <t:${reopensAt}:F>).`,
                    flags: MessageFlags.Ephemeral,
                });
                return;
            }

            // Cooldown has passed — clear the old record and let them apply fresh
            const { deleteApplication } =
                await import('../services/applicationManager');
            deleteApplication(interaction.user.id);
        }
    }

    // Create modal
    const modal = new ModalBuilder()
        .setCustomId('application_modal')
        .setTitle('Application Form');

    //-----INPUT TEXT BASED QUESTIONS BELOW THIS ----------

    // Minecraft Username input
    const minecraftUsernameInput = new TextInputBuilder()
        .setCustomId('minecraft_username_input')
        .setLabel('What is your Minecraft Username?')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Enter your Minecraft username')
        .setRequired(true)
        .setMinLength(3)
        .setMaxLength(16);

    // Reason input
    const reasonInput = new TextInputBuilder()
        .setCustomId('reason_input')
        .setLabel('Why do you want to join?')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Tell us why you want to be part of the community')
        .setRequired(false)
        .setMaxLength(1000);

    // Experience input
    const experienceInput = new TextInputBuilder()
        .setCustomId('experience_input')
        .setLabel('Tell us about your experience!')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Share your background and experience')
        .setRequired(false)
        .setMaxLength(1000);

    // Add inputs to action rows
    const minecraftUsernameRow =
        new ActionRowBuilder<TextInputBuilder>().addComponents(
            minecraftUsernameInput
        );

    const reasonRow = new ActionRowBuilder<TextInputBuilder>().addComponents(
        reasonInput
    );

    const experienceRow =
        new ActionRowBuilder<TextInputBuilder>().addComponents(experienceInput);

    modal.addComponents(minecraftUsernameRow, reasonRow, experienceRow);

    // Show modal
    await interaction.showModal(modal);
}

//-----------Drop Down Menu Questions--------------

export async function handleApplicationModalSubmit(interaction: any) {
    // Get the values from the modal
    const minecraftUsername = interaction.fields.getTextInputValue(
        'minecraft_username_input'
    );
    const reason =
        interaction.fields.getTextInputValue('reason_input') || undefined;
    const experience =
        interaction.fields.getTextInputValue('experience_input') || undefined;

    // Validate Minecraft username
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const minecraftProfile = await validateMinecraftUsername(minecraftUsername);

    // Send ephemeral message with train question dropdown
    const trainSelect = new StringSelectMenuBuilder()
        .setCustomId(`train_select_${interaction.user.id}`)
        .setPlaceholder('Select your answer')
        .addOptions([
            {
                label: 'Yes',
                value: 'yes',
                emoji: '🚂',
            },
            {
                label: 'No',
                value: 'no',
                emoji: '❌',
            },
        ]);

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        trainSelect
    );

    let statusMessage = '';
    if (minecraftProfile.isValid) {
        statusMessage = `\n✅ Minecraft account validated: **${minecraftProfile.name}**`;
    } else {
        statusMessage = `\n⚠️ Warning: Could not validate Minecraft username. Moderators will review your application.`;
    }

    await interaction.editReply({
        content: `🚂 **Final Question:** Do you like trains?${statusMessage}`,
        components: [row],
    });

    // Store the application data temporarily
    if (!global.pendingApplications) {
        global.pendingApplications = new Map();
    }

    global.pendingApplications.set(interaction.user.id, {
        minecraftUsername: minecraftProfile.name || minecraftUsername,
        minecraftUUID: minecraftProfile.id,
        isValidMinecraftAccount: minecraftProfile.isValid,
        reason,
        experience,
    });
}

export async function handleTrainSelectMenu(
    interaction: StringSelectMenuInteraction
) {
    const userId = interaction.customId.split('_')[2];
    const likeTrains = interaction.values[0] === 'yes' ? 'Yes' : 'No';

    // Get the pending application data
    const pendingData = global.pendingApplications?.get(userId);

    if (!pendingData) {
        await interaction.update({
            content: '❌ Application data not found. Please start over.',
            components: [],
        });
        return;
    }

    // Create application with all data
    const application = createApplication(
        userId,
        interaction.user.username,
        pendingData.minecraftUsername,
        pendingData.minecraftUUID,
        pendingData.isValidMinecraftAccount,
        pendingData.reason,
        pendingData.experience,
        likeTrains
    );

    // Clean up temporary data
    global.pendingApplications?.delete(userId);

    await interaction.update({
        content: '✅ Application submitted! Please wait for moderator review.',
        components: [],
    });

    // Send to moderators channel
    await sendToModerators(
        interaction,
        application,
        pendingData.minecraftUsername,
        pendingData.minecraftUUID,
        pendingData.isValidMinecraftAccount,
        pendingData.reason,
        pendingData.experience,
        likeTrains
    );
}

async function sendToModerators(
    interaction: any,
    application: any,
    minecraftUsername: string,
    minecraftUUID?: string,
    isValidMinecraftAccount?: boolean,
    reason?: string,
    experience?: string,
    likeTrains?: string
) {
    const reviewChannelId = process.env.APPLICATION_REVIEW_CHANNEL_ID;

    if (!reviewChannelId) {
        console.error('APPLICATION_REVIEW_CHANNEL_ID not set in .env');
        return;
    }

    const reviewChannel =
        await interaction.client.channels.fetch(reviewChannelId);

    if (!reviewChannel || !reviewChannel.isTextBased()) {
        console.error('Invalid review channel');
        return;
    }

    const embed = new EmbedBuilder()
        .setTitle(`New Application from ${interaction.user.username}`)
        .setThumbnail(interaction.user.displayAvatarURL({ size: 256 }))
        .addFields(
            { name: 'User', value: `<@${interaction.user.id}>`, inline: true },
            { name: 'User ID', value: interaction.user.id, inline: true },
            {
                name: 'Minecraft Username',
                value: minecraftUsername,
                inline: false,
            }
        )
        .setColor(isValidMinecraftAccount ? Colors.Blue : Colors.Orange);

    // Add Minecraft validation status
    if (isValidMinecraftAccount && minecraftUUID) {
        embed.addFields({
            name: '✅ Minecraft Account Status',
            value: `**Valid Account**\nUUID: \`${formatUUID(minecraftUUID)}\`\n[View on NameMC](https://namemc.com/profile/${minecraftUsername})`,
            inline: false,
        });
    } else {
        embed.addFields({
            name: '⚠️ Minecraft Account Status',
            value: '**Could not validate** - Username may be invalid or API error occurred',
            inline: false,
        });
    }

    embed.addFields(
        { name: 'Reason', value: reason || 'Not provided', inline: false },
        {
            name: 'Experience',
            value: experience || 'Not provided',
            inline: false,
        },
        {
            name: '🚂 Likes Trains?',
            value: likeTrains || 'Not answered',
            inline: true,
        }
    );

    embed.setTimestamp();

    const approveButton = new ButtonBuilder()
        .setCustomId(`approve_${interaction.user.id}`)
        .setLabel('✅ Approve')
        .setStyle(ButtonStyle.Success);

    const rejectButton = new ButtonBuilder()
        .setCustomId(`reject_${interaction.user.id}`)
        .setLabel('❌ Reject')
        .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        approveButton,
        rejectButton
    );

    const message = await reviewChannel.send({
        embeds: [embed],
        components: [row],
    });

    // Store message ID
    updateApplicationMessageId(interaction.user.id, message.id);
}
