import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    Message,
    EmbedBuilder,
    GuildMember,
    MessageFlags,
    User,
    TextChannel,
} from 'discord.js';
import { Command } from '../../handlers/types/command';
import {
    issueStrike,
    removeStrike,
    formatTimeRemaining,
    StrikeRecord,
} from '../../services/strikeManager';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Parse ADVANCED_COMMANDS_ROLE_ID (comma-separated) into an array of IDs. */
function getAdvancedRoleIds(): string[] {
    return (process.env.ADVANCED_COMMANDS_ROLE_ID ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
}

/** Strip Discord mention formatting and return the raw snowflake ID. */
function extractUserId(raw: string): string {
    return raw.replace(/^<@!?(\d+)>$/, '$1').trim();
}

/** Resolve a user from a mention string or raw ID. Returns null on failure. */
async function resolveUser(
    rawInput: string,
    fetchUser: (id: string) => Promise<User>
): Promise<User | null> {
    const id = extractUserId(rawInput);
    if (!/^\d+$/.test(id)) return null;
    try {
        return await fetchUser(id);
    } catch {
        return null;
    }
}

// ---------------------------------------------------------------------------
// Embed builders
// ---------------------------------------------------------------------------

/**
 * Build the detailed embed that goes to the moderation log channel.
 *
 * Strike 1 is a 7-day single-phase strike — no downgrade schedule shown.
 * Strike 2 downgrades to 1 after 83 days (7 days remain).
 * Strike 3 downgrades 3→2 at day 60, then 2→1 at day 83, cleared at day 90.
 */
function buildLogEmbed(
    action: 'issued' | 'removed',
    targetUser: User,
    level: number | null,
    record: StrikeRecord | null,
    moderator: User
): EmbedBuilder {
    if (action === 'removed') {
        return new EmbedBuilder()
            .setTitle('⚪ Strike Removed')
            .setColor(0x2ecc71)
            .addFields(
                {
                    name: 'User',
                    value: `<@${targetUser.id}> (${targetUser.tag})`,
                    inline: true,
                },
                {
                    name: 'Removed by',
                    value: `<@${moderator.id}>`,
                    inline: true,
                }
            )
            .setTimestamp();
    }

    const lvl = level as 1 | 2 | 3;
    const colors: Record<1 | 2 | 3, number> = {
        1: 0xffc107,
        2: 0xff8c00,
        3: 0xe74c3c,
    };
    const emoji = { 1: '🟡', 2: '🟠', 3: '🔴' }[lvl];

    // Build the schedule field value
    let scheduleValue = 'N/A';
    if (record) {
        const lines: string[] = [];

        if (lvl === 3) {
            lines.push(
                `**Issued (Strike 3):** <t:${Math.floor(record.issuedAt / 1000)}:F>`,
                `**→ Strike 2:** <t:${Math.floor((record.expiresAt - 30 * 24 * 60 * 60 * 1000) / 1000)}:F>`,
                `**→ Strike 1:** <t:${Math.floor((record.expiresAt - 7 * 24 * 60 * 60 * 1000) / 1000)}:F>`,
                `**→ Cleared:** <t:${Math.floor(record.expiresAt / 1000)}:F>`
            );
        } else if (lvl === 2) {
            lines.push(
                `**Issued (Strike 2):** <t:${Math.floor(record.issuedAt / 1000)}:F>`,
                `**→ Strike 1:** <t:${Math.floor((record.expiresAt - 7 * 24 * 60 * 60 * 1000) / 1000)}:F>`,
                `**→ Cleared:** <t:${Math.floor(record.expiresAt / 1000)}:F>`
            );
        } else {
            // Strike 1 — single phase, 7 days
            lines.push(
                `**Issued (Strike 1):** <t:${Math.floor(record.issuedAt / 1000)}:F>`,
                `**→ Cleared:** <t:${Math.floor(record.expiresAt / 1000)}:F>`
            );
        }

        scheduleValue = lines.join('\n');
    }

    return new EmbedBuilder()
        .setTitle(`${emoji} Strike ${lvl} Issued`)
        .setColor(colors[lvl])
        .addFields(
            {
                name: 'User',
                value: `<@${targetUser.id}> (${targetUser.tag})`,
                inline: true,
            },
            { name: 'Strike Level', value: `**${lvl}**`, inline: true },
            { name: 'Issued by', value: `<@${moderator.id}>`, inline: true },
            { name: '⏱ Schedule', value: scheduleValue, inline: false }
        )
        .setFooter({
            text: `Time remaining: ${record ? formatTimeRemaining(record) : 'N/A'}`,
        })
        .setTimestamp();
}

// ---------------------------------------------------------------------------
// Shared execution logic
// ---------------------------------------------------------------------------

interface ExecuteParams {
    levelStr: string;
    targetStr: string;
    guildId: string;
    moderator: User;
    fetchUser: (id: string) => Promise<User>;
    /** Send a plain-text acknowledgement in the command channel */
    ackReply: (text: string) => Promise<void>;
    /** Send the detailed embed to the moderation log channel */
    sendLog: (embed: EmbedBuilder) => Promise<void>;
    /** Send an ephemeral / inline error back to the moderator */
    sendError: (text: string) => Promise<void>;
}

async function executeStrike(params: ExecuteParams) {
    const {
        levelStr,
        targetStr,
        guildId,
        moderator,
        fetchUser,
        ackReply,
        sendLog,
        sendError,
    } = params;

    // Validate level
    const level = parseInt(levelStr, 10);
    if (![0, 1, 2, 3].includes(level)) {
        await sendError(
            '❌ Strike level must be **1**, **2**, or **3**. Use **0** to remove a strike.'
        );
        return;
    }

    // Resolve target user
    const targetUser = await resolveUser(targetStr, fetchUser);
    if (!targetUser) {
        await sendError(
            '❌ Could not find that user. Provide a valid mention or Discord ID.'
        );
        return;
    }

    // --- Remove strike (level 0) ---
    if (level === 0) {
        const removed = await removeStrike(targetUser.id, guildId);
        if (!removed) {
            await sendError(
                `❌ <@${targetUser.id}> has no active strike to remove.`
            );
            return;
        }
        await sendLog(
            buildLogEmbed('removed', targetUser, null, null, moderator)
        );
        await ackReply(`✅ Strike removed for **${targetUser.tag}**.`);
        return;
    }

    // --- Issue strike ---
    const record = await issueStrike(
        targetUser.id,
        level as 1 | 2 | 3,
        moderator.id,
        guildId
    );

    await sendLog(
        buildLogEmbed('issued', targetUser, level, record, moderator)
    );
    await ackReply(`✅ Strike **${level}** issued to **${targetUser.tag}**.`);
}

// ---------------------------------------------------------------------------
// Command definition
// ---------------------------------------------------------------------------

const strikeCommand: Command = {
    name: 'strike',
    description:
        'Issue or remove a strike (level 1–3) for a user, or 0 to remove',
    requiredRoles: getAdvancedRoleIds(),
    data: new SlashCommandBuilder()
        .setName('strike')
        .setDescription('Issue or remove a strike for a user')
        .addIntegerOption((opt) =>
            opt
                .setName('level')
                .setDescription('Strike level: 1, 2, or 3 (use 0 to remove)')
                .setRequired(true)
                .addChoices(
                    { name: '0 – Remove strike', value: 0 },
                    { name: '1 – Warning  (🟡)', value: 1 },
                    { name: '2 – Serious  (🟠)', value: 2 },
                    { name: '3 – Severe   (🔴)', value: 3 }
                )
        )
        .addStringOption((opt) =>
            opt
                .setName('user')
                .setDescription('User mention or Discord ID')
                .setRequired(true)
        ) as SlashCommandBuilder,

    // -------------------------------------------------------------------------
    // Slash handler
    // -------------------------------------------------------------------------
    executeSlash: async (interaction: ChatInputCommandInteraction) => {
        if (!interaction.guild) {
            await interaction.reply({
                content: '❌ This command can only be used in a server.',
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        // Defer so we have time to hit the Mojang API / RCON if needed
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const levelStr = String(interaction.options.getInteger('level', true));
        const targetStr = interaction.options.getString('user', true);

        // Resolve the moderation log channel once
        const logChannelId = process.env.MODERATION_LOGS_CHANNEL_ID;
        let logChannel: TextChannel | null = null;
        if (logChannelId) {
            const fetched = await interaction.client.channels
                .fetch(logChannelId)
                .catch(() => null);
            if (fetched?.isTextBased()) logChannel = fetched as TextChannel;
        }

        await executeStrike({
            levelStr,
            targetStr,
            guildId: interaction.guild.id,
            moderator: interaction.user,
            fetchUser: (id) => interaction.client.users.fetch(id),

            ackReply: async (text) => {
                // Edit the ephemeral deferred reply in the command channel
                await interaction.editReply({ content: text });
            },

            sendLog: async (embed) => {
                if (logChannel) {
                    await logChannel.send({ embeds: [embed] });
                } else {
                    // Fallback: send to same channel if log channel not configured
                    await interaction.channel?.send({ embeds: [embed] });
                }
            },

            sendError: async (text) => {
                await interaction.editReply({ content: text });
            },
        });
    },

    // -------------------------------------------------------------------------
    // Text (prefix) handler
    // -------------------------------------------------------------------------
    executeText: async (message: Message, args: string[]) => {
        if (!message.guild) {
            await message.channel.send(
                '❌ This command can only be used in a server.'
            );
            return;
        }

        if (args.length < 2) {
            await message.channel.send(
                '❌ Usage: `!strike <level> <userID or @mention>`\nLevel: 0 (remove), 1, 2, or 3.'
            );
            return;
        }

        const [levelStr, targetStr] = args;

        // Resolve the moderation log channel once
        const logChannelId = process.env.MODERATION_LOGS_CHANNEL_ID;
        let logChannel: TextChannel | null = null;
        if (logChannelId) {
            const fetched = await message.client.channels
                .fetch(logChannelId)
                .catch(() => null);
            if (fetched?.isTextBased()) logChannel = fetched as TextChannel;
        }

        await executeStrike({
            levelStr,
            targetStr,
            guildId: message.guild.id,
            moderator: message.author,
            fetchUser: (id) => message.client.users.fetch(id),

            ackReply: async (text) => {
                await message.channel.send(text);
            },

            sendLog: async (embed) => {
                if (logChannel) {
                    await logChannel.send({ embeds: [embed] });
                } else {
                    // Fallback: send to same channel if log channel not configured
                    await message.channel.send({ embeds: [embed] });
                }
            },

            sendError: async (text) => {
                await message.channel.send(text);
            },
        });
    },
};

export default strikeCommand;
