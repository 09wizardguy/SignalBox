require('dotenv').config();

const {
	Client,
	GatewayIntentBits,
	Partials,
	EmbedBuilder,
	Events,
} = require('discord.js');

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

	if (process.env.LOGS_CHANNEL_ID) {
		const logsChannel = await client.channels.fetch(
			process.env.LOGS_CHANNEL_ID
		);

		if (!logsChannel.isTextBased()) return;

		const embed = new EmbedBuilder()
			.setDescription(
				`## SignalBox is Online! :green_circle:
					Time: <t:${Math.floor(Date.now() / 1000)}:R>
					OS: **${process.platform}**
					Node.js Version: **${process.version}**
					Discord.js Version: **${process.env.npm_package_dependencies_discord_js}**
				`
			)
			.setColor('Green');

		await logsChannel.send({ embeds: [embed] });
	}

	client.user?.presence.set({
		activities: [{ name: 'Watching the Rails' }],
		status: 'online',
	});
});

if (!process.env.DISCORD_TOKEN) {
	console.error('ERROR: DISCORD_TOKEN is not defined in .env file');
	process.exit(1);
}

client.login(process.env.DISCORD_TOKEN)
	.then(() => console.log('Logged into Discord Successfully'))
	.catch((err) => console.error('Failed to login:', err));

module.exports = client;