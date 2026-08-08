import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    Message,
} from 'discord.js';
import { Command } from '../../../../handlers/types/command';
import { deleteReminder } from '../functions/reminderManager';

const delreminderCommandData = new SlashCommandBuilder()
    .setName('delreminder')
    .setDescription('Delete a reminder by number');
delreminderCommandData.addIntegerOption((opt) =>
    opt.setName('num').setDescription('Reminder number').setRequired(true)
);

const delreminderCommand: Command = {
    name: 'delreminder',
    description: 'Delete a reminder by number',
    requiredRoles: [process.env.BASIC_COMMANDS_ROLE_ID!],
    data: delreminderCommandData,
    executeSlash: async (interaction: ChatInputCommandInteraction) => {
        const num = interaction.options.getInteger('num', true);
        const success = deleteReminder(interaction.user.id, num - 1);

        if (success) {
            await interaction.reply(`🗑️ Reminder #${num} deleted.`);
        } else {
            await interaction.reply(`⚠️ Invalid reminder number.`);
        }
    },
    executeText: async (message: Message, args: string[]) => {
        const num = parseInt(args[0]);

        if (isNaN(num)) {
            await message.reply('Usage: !delreminder <number>');
            return;
        }

        const success = deleteReminder(message.author.id, num - 1);
        if (success) {
            await message.reply(`🗑️ Reminder #${num} deleted.`);
        } else {
            await message.reply(`⚠️ Invalid reminder number.`);
        }
    },
};

export default delreminderCommand;
