import 'dotenv/config';
import {
	Client,
	GatewayIntentBits,
	Partials,
	EmbedBuilder,
	Events,
	TextBasedChannel,
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
	],
	partials: [Partials.Channel],
});

client.once(Events.ClientReady, async () => {
	console.log('Discord Bot is Ready!');

	const logsChannelId = process.env.LOGS_CHANNEL_ID;

	if (logsChannelId) {
		const logsChannel = await client.channels.fetch(logsChannelId);

		// Type guard: ensure the channel is text-based
		if (!logsChannel || !('isTextBased' in logsChannel) || !logsChannel.isTextBased()) return;

		const mode =
			process.env.NODE_ENV === 'development' 
			? 'development'
			: 'production';

		const embed = new EmbedBuilder()
			.setDescription(
				`## SignalBox is Online! :green_circle:
				Time: <t:${Math.floor(Date.now() / 1000)}:R>
				Running in **${mode}** mode
				OS: **${process.platform}**
				Node.js Version: **${process.version}**
				Discord.js Version: **${process.env.npm_package_dependencies_discord_js}**
				`
			)
			.setColor('Green');

		await logsChannel.send({ embeds: [embed] });
	}

		if (process.env.NODE_ENV !== 'development')
			console.warn('Running in Production mode');

		client.user?.setPresence({
			activities: [{ name: 'Watching the Rails' }],
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

			if ( channel.parent && channel.parent.id === process.env.SUPPORT_CHANNEL_ID) {
				await message.edit(`<@&${SupportRoleId}>`);
			};

			await timeout(1000);

			await message.delete();
		}
	} catch (error) {
		console.error('Error in ThreadCreate event:', error);
	}
});

async function timeout(time: number | undefined) {
	return await new Promise((resolve) => setTimeout(resolve, time));
}

// Ensure the token exists
if (!process.env.DISCORD_TOKEN) {
	console.error('ERROR: DISCORD_TOKEN is not defined in .env file');
	process.exit(1);
}

// Log in to Discord
client
	.login(process.env.DISCORD_TOKEN)
	.then(() => console.log('Logged into Discord Successfully'))
	.catch((err) => console.error('Failed to login:', err));

export default client;
