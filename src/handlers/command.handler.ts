import dotenv from 'dotenv';

import {
    REST,
    Routes,
    Collection,
    EmbedBuilder,
    Events,
    RESTGetAPIOAuth2CurrentApplicationResult,
    Client,
    MessageFlags,
} from 'discord.js';

import commands from '../commands/_commands';

import { Command } from './types/command';

import { checkPermissions, checkRoles } from './permissions.handler';

dotenv.config();

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN!);

/**
 * Collection of slash-capable commands.
 *
 * Commands are statically imported by _commands.ts so tsup
 * can bundle them correctly.
 */
const commandCollection = new Collection<string, Command>(
    commands.filter((cmd) => cmd.data).map((cmd) => [cmd.data!.name, cmd])
);

export type Handler = (context: { client: Client }) => void;

export async function reloadGlobalSlashCommands() {
    try {
        console.log(`Refreshing ${commandCollection.size} slash commands...`);

        console.time('Refreshing commands');

        const { id: appID } = (await rest.get(
            Routes.oauth2CurrentApplication()
        )) as RESTGetAPIOAuth2CurrentApplicationResult;

        await rest.put(Routes.applicationCommands(appID), {
            body: [...commandCollection.values()].map((cmd) =>
                cmd.data!.toJSON()
            ),
        });

        console.log('Slash commands reloaded.');
        console.timeEnd('Refreshing commands');
    } catch (error) {
        console.error(error);
    }
}

const commandHandler: Handler = ({ client }) => {
    client.on(Events.InteractionCreate, async (interaction) => {
        if (!interaction.isChatInputCommand()) return;

        const cmd = commandCollection.get(interaction.commandName);

        if (!cmd || !cmd.executeSlash) return;

        try {
            // Role check
            if (cmd.requiredRoles && cmd.requiredRoles.length > 0) {
                const hasRoles = await checkRoles(
                    interaction,
                    cmd.requiredRoles
                );

                if (!hasRoles) {
                    return;
                }
            }

            // Permission check
            if (cmd.requiredPermissions) {
                const hasPerms = await checkPermissions(
                    interaction,
                    cmd.requiredPermissions
                );

                if (!hasPerms) {
                    return;
                }
            }

            await cmd.executeSlash(interaction);
        } catch (error) {
            console.error(error);

            if (interaction.isRepliable()) {
                // An interaction may already have been acknowledged
                // by the command before the error occurred.
                if (interaction.replied || interaction.deferred) {
                    await interaction
                        .followUp({
                            embeds: [
                                new EmbedBuilder()
                                    .setTitle('Error')
                                    .setDescription(
                                        'There was an error executing that command.'
                                    )
                                    .setColor('Red'),
                            ],
                            flags: MessageFlags.Ephemeral,
                        })
                        .catch(console.error);
                } else {
                    await interaction
                        .reply({
                            embeds: [
                                new EmbedBuilder()
                                    .setTitle('Error')
                                    .setDescription(
                                        'There was an error executing that command.'
                                    )
                                    .setColor('Red'),
                            ],
                            flags: MessageFlags.Ephemeral,
                        })
                        .catch(console.error);
                }
            }
        }
    });
};

export default commandHandler;
