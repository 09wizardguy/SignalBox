import dotenv from 'dotenv';
import {
	REST,
	Routes,
	SlashCommandBuilder,
	Collection,
	EmbedBuilder,
	Events,
	ChatInputCommandInteraction,
	RESTGetAPIOAuth2CurrentApplicationResult,
	Client,
	PermissionResolvable,
} from 'discord.js';
import commands from '../commands/_commands';

dotenv.config();

// REST client setup
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN!);

// Command interface
export interface Command {
	data: SlashCommandBuilder;
	execute: (interaction: ChatInputCommandInteraction) => unknown;
	requiredPermissions?: PermissionResolvable[]; 
}

// Handler type (assuming you pass in an object with a Discord client)
export type Handler = (context: { client: Client }) => void;

// Collection of commands
const commandCollection = new Collection<string, Command>(
	commands.map((cmd) => [cmd.data.name, cmd])
);

console.log(
	`Loaded ${commands.length} command${commands.length === 1 ? '' : 's'}:`
);
commands.forEach((cmd) => console.log(`- ${cmd.data.name}`));

// Function to reload slash commands globally
export async function reloadGlobalSlashCommands() {
	try {
		console.log(
			`Started refreshing ${commands.length} application (/) commands.`
		);
		console.time('Refreshing commands');

		const { id: appID } = (await rest.get(
			Routes.oauth2CurrentApplication()
		)) as RESTGetAPIOAuth2CurrentApplicationResult;

		await rest.put(Routes.applicationCommands(appID), {
			body: commands.map((cmd) => cmd.data.toJSON()),
		});

		console.log('Successfully reloaded commands.');
		console.timeEnd('Refreshing commands');
	} catch (error) {
		console.error(error);
	}
}

// Command handler
const commandHandler: Handler = ({ client }) => {
	client.on(Events.InteractionCreate, async (interaction) => {
		if (!interaction.isChatInputCommand()) return;
		if (!commandCollection.has(interaction.commandName)) return;

		try {
			await commandCollection
				.get(interaction.commandName)!
				.execute(interaction);

			if (!interaction.replied) {
				await interaction.reply({
					embeds: [new EmbedBuilder().setTitle('Command Executed')],
					ephemeral: true,
				});
			}
		} catch (error) {
			console.error(error);

			if (interaction.isRepliable()) {
				await interaction.reply({
					embeds: [
						new EmbedBuilder()
							.setTitle('Error Occurred')
							.setDescription('An error occurred while executing the command.')
							.setColor('Red'),
					],
					ephemeral: true,
				});
			}
		}
	});
};

export default commandHandler;
