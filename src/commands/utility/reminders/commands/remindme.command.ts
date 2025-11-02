import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    Message,
} from 'discord.js';
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
        ),
    executeSlash: async (interaction: ChatInputCommandInteraction) => {
        const time = interaction.options.getString('time', true);
        const msg = interaction.options.getString('message') || '';

        await scheduleReminder(
            interaction.user.id,
            time,
            msg,
            async (message, createdAt) => {
                await interaction.channel?.send(
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
        if (!time) {
            await message.channel.send('Usage: !remindme <time> <message?>');
            return;
        }
        const msg = reminderMessage.join(' ');

        await scheduleReminder(
            message.author.id,
            time,
            msg,
            (reminderText, createdAt) =>
                message.channel.send(
                    `⏰ Reminder for <@${
                        message.author.id
                    }>: ${reminderText} set <t:${Math.floor(createdAt / 1000)}:R>`
                )
        );

        await message.channel.send(`⏰ Reminder set for **${time}**`);
    },
};

export default remindmeCommand;
