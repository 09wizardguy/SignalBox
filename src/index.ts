import 'dotenv/config';

import commandHandler, {
    reloadGlobalSlashCommands,
} from './handlers/command.handler';

import textCommandHandler from './handlers/textCommand.handler';

import { loadReminders } from './commands/utility/reminders/functions/reminderManager';

import { loadApplications } from './services/applicationManager';

import {
    initializeInviteTracking,
    handleMemberJoin,
    handleInviteCreate,
    handleInviteDelete,
} from './handlers/inviteTracker';

import { initStrikeManager, loadStrikes } from './services/strikeManager';

import { initializePersistence } from './services/persistence';

import {
    Client,
    GatewayIntentBits,
    Partials,
    EmbedBuilder,
    Events,
    ChannelType,
} from 'discord.js';

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildInvites,
    ],
    partials: [Partials.Channel],
});

client.once(Events.ClientReady, async () => {
    console.log('Discord Bot is Ready!');

    // Persistence
    try {
        await initializePersistence();
    } catch (error) {
        console.error('Failed to initialize persistence:', error);

        process.exit(1);
    }

    // Invite tracking
    await initializeInviteTracking(client);

    // Reminders
    await loadReminders(async (userId, message, createdAt) => {
        try {
            const user = await client.users.fetch(userId);

            const dmChannel = await user.createDM();

            await dmChannel.send(
                `⏰ Reminder for <@${userId}>: ${message} set <t:${Math.floor(
                    createdAt / 1000
                )}:R>`
            );
        } catch (error) {
            console.error(`Failed to send reminder to user ${userId}:`, error);
        }
    });

    // Applications
    await loadApplications();

    // Strike system — must init client reference BEFORE loading persisted data
    initStrikeManager(client);

    for (const guild of client.guilds.cache.values()) {
        await loadStrikes(guild.id);
    }

    // Startup log
    const logsChannelId = process.env.STARTUP_LOGS_CHANNEL_ID;

    if (logsChannelId) {
        const logsChannel = await client.channels
            .fetch(logsChannelId)
            .catch(() => null);

        if (logsChannel && logsChannel.isTextBased()) {
            const mode =
                process.env.NODE_ENV === 'development'
                    ? 'development'
                    : 'production';

            const textChannel = logsChannel as unknown as {
                send: (payload: { embeds: EmbedBuilder[] }) => Promise<unknown>;
            };

            await textChannel.send({
                embeds: [
                    new EmbedBuilder()
                        .setDescription(
                            `## SignalBox is Online! :green_circle:
\t\t\t\tTime: <t:${Math.floor(Date.now() / 1000)}:R>
\t\t\t\tRunning in **${mode}** mode
\t\t\t\tOS: **${process.platform}**
\t\t\t\tNode.js Version: **${process.version}**
\t\t\t\tDiscord.js Version: **${process.env.npm_package_dependencies_discord_js}**
\t\t\t\t`
                        )
                        .setColor('Green'),
                ],
            });
        }
    }

    if (process.env.NODE_ENV !== 'development')
        console.warn('Running in Production mode');

    client.user?.setPresence({
        activities: [
            {
                name: 'Watching the Rails',
            },
        ],
        status: 'online',
    });
});

client.on(Events.ThreadCreate, async (channel) => {
    try {
        if (channel.type === ChannelType.PublicThread && channel.guild) {
            const ModeratorRoleId = process.env.MODERATOR_ROLE_ID;

            const SupportRoleId = process.env.SUPPORT_ROLE_ID;

            await timeout(2000);

            const message = await channel.send(
                'Auto-adding moderators and relevant roles to this thread...'
            );

            await timeout(2000);

            await message.edit(`<@&${ModeratorRoleId}>`);

            await timeout(2000);

            if (
                channel.parent &&
                channel.parent.id === process.env.SUPPORT_CHANNEL_ID
            ) {
                await message.edit(`<@&${SupportRoleId}>`);
            }

            await timeout(1000);

            await message.delete();
        }
    } catch (error) {
        console.error('Error in ThreadCreate event:', error);
    }
});

client.on(Events.GuildMemberAdd, async (member) => {
    await handleMemberJoin(member);
});

client.on(Events.InviteCreate, async (invite) => {
    await handleInviteCreate(invite);
});

client.on(Events.InviteDelete, async (invite) => {
    await handleInviteDelete(invite);
});

async function timeout(time: number | undefined) {
    return await new Promise((resolve) => setTimeout(resolve, time));
}

export type Handler = (args: { client: Client }) => void;

const handlers: Handler[] = [commandHandler, textCommandHandler];

handlers.forEach((handler) => handler({ client }));

if (!process.env.DISCORD_TOKEN) {
    console.error('ERROR: DISCORD_TOKEN is not defined in .env file');

    process.exit(1);
}

reloadGlobalSlashCommands()
    .then(() => {
        client
            .login(process.env.DISCORD_TOKEN)
            .then(() => console.log('Logged into Discord Successfully'))
            .catch((err) => console.error('Failed to login:', err));
    })
    .catch((err) =>
        console.error('Failed to reload global slash commands:', err)
    );

export default client;
