import { Events, Message, EmbedBuilder, Interaction } from 'discord.js';
import { Handler } from '..';
import { textCommands } from '../commands/_commands';
import {
    checkPermissions,
    checkRoles,
    sendNoPermission,
    sendNoRole,
} from './permissions.handler';
import { Command } from '../handlers/types/command';
import {
    handleApplyButton,
    handleApplicationModalSubmit,
    handleTrainSelectMenu,
} from '../buttons/handleApply';
import {
    handleApproveButton,
    handleRejectButton,
} from '../buttons/handleApproveReject';

const PREFIX = '!';

const textCommandHandler: Handler = ({ client }) => {
    client.on(Events.MessageCreate, async (message: Message) => {
        if (!message.content.startsWith(PREFIX) || message.author.bot) return;

        const args = message.content.slice(PREFIX.length).trim().split(/ +/);
        const commandName = args.shift()?.toLowerCase();
        if (!commandName) return;

        // Safety check: filter out invalid commands
        const validCommands = textCommands.filter((cmd) => cmd && cmd.name);

        const command: Command | undefined = validCommands.find(
            (cmd) => cmd.name.toLowerCase() === commandName
        );

        if (!command || !command.executeText) return;

        // Role check
        if (command.requiredRoles && command.requiredRoles.length > 0) {
            const hasRoles = await checkRoles(message, command.requiredRoles);
            if (!hasRoles) {
                return;
            }
        }

        // Permission check
        if (command.requiredPermissions) {
            const hasPerms = await checkPermissions(
                message,
                command.requiredPermissions
            );
            if (!hasPerms) {
                return;
            }
        }

        // Execute command safely
        try {
            await command.executeText(message, args);
        } catch (error) {
            console.error(
                `Error executing text command ${command.name}:`,
                error
            );
            await message.channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setTitle('Error')
                        .setDescription(
                            'There was an error executing that command.'
                        ),
                ],
            });
        }
    });

    // Handle button interactions
    client.on(Events.InteractionCreate, async (interaction: Interaction) => {
        if (interaction.isButton()) {
            const customId = interaction.customId;

            try {
                if (customId === 'apply') {
                    await handleApplyButton(interaction);
                } else if (customId.startsWith('approve_')) {
                    await handleApproveButton(interaction);
                } else if (customId.startsWith('reject_')) {
                    await handleRejectButton(interaction);
                }
            } catch (error) {
                console.error('Error handling button interaction:', error);
                if (interaction.isRepliable() && !interaction.replied) {
                    await interaction.reply({
                        content:
                            '❌ An error occurred while processing your request.',
                        ephemeral: true,
                    });
                }
            }
        }

        // Handle modal submissions
        if (interaction.isModalSubmit()) {
            try {
                if (interaction.customId === 'application_modal') {
                    await handleApplicationModalSubmit(interaction);
                }
            } catch (error) {
                console.error('Error handling modal submission:', error);
                if (interaction.isRepliable() && !interaction.replied) {
                    await interaction.reply({
                        content:
                            '❌ An error occurred while processing your application.',
                        ephemeral: true,
                    });
                }
            }
        }

        // Handle select menu interactions
        if (interaction.isStringSelectMenu()) {
            try {
                if (interaction.customId.startsWith('train_select_')) {
                    await handleTrainSelectMenu(interaction);
                }
            } catch (error) {
                console.error('Error handling select menu interaction:', error);
                if (interaction.isRepliable() && !interaction.replied) {
                    await interaction.reply({
                        content:
                            '❌ An error occurred while processing your selection.',
                        ephemeral: true,
                    });
                }
            }
        }
    });
};

export default textCommandHandler;
