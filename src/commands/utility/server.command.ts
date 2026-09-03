import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    Message,
} from 'discord.js';
import { Command } from '../../handlers/types/command';

const serverCommand: Command = {
    name: 'server',
    description: 'Provides information about the server',
    data: new SlashCommandBuilder()
        .setName('server')
        .setDescription('Info about the server'),
    executeSlash: async (interaction: ChatInputCommandInteraction) => {
        const { guild } = interaction;
        if (!guild) {
            await interaction.reply(
                'This command can only be used in a server.'
            );
            return;
        }

        await interaction.reply(
            `🏰 Server: **${guild.name}**\n👥 Members: ${guild.memberCount}`
        );
    },
    executeText: async (message: Message) => {
        const { guild } = message;
        if (!guild) {
            await message.reply('This command can only be used in a server.');
            return;
        }

        await message.reply(
            `🏰 Server: **${guild.name}**\n👥 Members: ${guild.memberCount}`
        );
    },
};

export default serverCommand;
