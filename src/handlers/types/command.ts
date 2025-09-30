import {
	SlashCommandBuilder,
	ChatInputCommandInteraction,
	Message,
	PermissionResolvable,
} from 'discord.js';

export interface Command {
	name: string; // required for text commands
	description: string;
	data?: SlashCommandBuilder; // optional for slash
	executeSlash?: (interaction: ChatInputCommandInteraction) => Promise<void>;
	executeText?: (message: Message, args: string[]) => Promise<void>;
	requiredPermissions?: PermissionResolvable[];
}
