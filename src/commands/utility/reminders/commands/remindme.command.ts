import { SlashCommandBuilder } from '@discordjs/builders';
import { ChatInputCommandInteraction, Message, TextChannel } from 'discord.js';
import { Command } from '../../../../handlers/types/command';
import { scheduleReminder } from '../functions/reminderManager';

const remindmeCommand: Command = {
    name: 'remindme',
    description: 'Set a reminder',
    requiredRoles: [process.env.BASIC_COMMANDS_ROLE_ID!],
    data: new SlashCommandBuilder()
        .setName('remindme')
        .setDescription('Set a reminder')
        .addStringOption((opt) =>
            opt
                .setName('time')
                .setDescription('Time (1m, 2h, 3d, 1w)')
                .setRequired(true)
        )
        .addStringOption((opt) =>
            opt
                .setName('message')
                .setDescription('Reminder text')
                .setRequired(false)
        ) as SlashCommandBuilder,
    executeSlash: async (interaction: ChatInputCommandInteraction) => {
        const time = interaction.options.getString('time', true);
        const msg = interaction.options.getString('message') || '';
        const channel = interaction.channel;

        if (!channel?.isTextBased()) {
            await interaction.reply({
                content: 'Unable to set reminder: no valid text channel found.',
                ephemeral: true,
            });
            return;
        }

        const textChannel = channel as TextChannel;

        await scheduleReminder(
            interaction.user.id,
            time,
            msg,
            textChannel.id,
            async (message, createdAt) => {
                await textChannel.send(
                    `⏰ Reminder for <@${
                        interaction.user.id
                    }>: ${message} set <t:${Math.floor(createdAt / 1000)}:R>`
                );
            }
        );

        await interaction.reply(`⏰ Reminder set for **${time}**`);
    },
    executeText: async (message: Message, args: string[]) => {
        const [time, ...reminderMessage] = args;
        const channel = message.channel;

        if (!channel.isTextBased()) {
            await message.reply(
                'Unable to set reminder: no valid text channel found.'
            );
            return;
        }

        const textChannel = channel as TextChannel;

        if (!time) {
            await textChannel.send('Usage: !remindme <time> <message?>');
            return;
        }
        const msg = reminderMessage.join(' ');

        await scheduleReminder(
            message.author.id,
            time,
            msg,
            textChannel.id,
            async (reminderText, createdAt) => {
                await textChannel.send(
                    `⏰ Reminder for <@${message.author.id}>: ${reminderText} set <t:${Math.floor(createdAt / 1000)}:R>`
                );
            }
        );

        await textChannel.send(`⏰ Reminder set for **${time}**`);
    },
};

export default remindmeCommand;
