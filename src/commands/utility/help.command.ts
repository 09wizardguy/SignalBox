import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    Message,
    TextChannel,
} from 'discord.js';
import { Command } from '../../handlers/types/command';

const DOCS_URL =
    '<https://github.com/09wizardguy/SignalBox/blob/prod/COMMANDS.md>';
const HELP_MESSAGE = `📖 For a full list of commands and how to use them, check out the documentation:\n${DOCS_URL}`;

const helpCommand: Command = {
    name: 'help',
    description: 'Links to the SignalBox command documentation',
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Links to the SignalBox command documentation'),

    async executeSlash(interaction: ChatInputCommandInteraction) {
        await interaction.reply(HELP_MESSAGE);
    },

    async executeText(message: Message) {
        const channel = message.channel;
        const textChannel = channel as TextChannel;

        await textChannel.send(HELP_MESSAGE);
    },
};

export default helpCommand;
