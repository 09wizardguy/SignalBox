import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    Message,
    EmbedBuilder,
    MessageFlags,
    User,
} from 'discord.js';
import { Command } from '../../handlers/types/command';
import {
    getStrike,
    formatTimeRemaining,
    StrikeRecord,
} from '../../services/strikeManager';

function getAdvancedRoleIds(): string[] {
    return (process.env.ADVANCED_COMMANDS_ROLE_ID ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
}

function extractUserId(raw: string): string {
    return raw.replace(/^<@!?(\d+)>$/, '$1').trim();
}

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

function buildStrikeEmbed(
    targetUser: User,
    record: StrikeRecord | null
): EmbedBuilder {
    if (!record) {
        return new EmbedBuilder()
            .setTitle('⚪ No Active Strike')
            .setColor(0x95a5a6)
            .setDescription(`**${targetUser.tag}** has no active strike.`)
            .setThumbnail(targetUser.displayAvatarURL())
            .setTimestamp();
    }

    const lvl = record.currentLevel as 1 | 2 | 3;
    const colors: Record<1 | 2 | 3, number> = {
        1: 0xffc107,
        2: 0xff8c00,
        3: 0xe74c3c,
    };
    const emoji = { 1: '🟡', 2: '🟠', 3: '🔴' }[lvl];

    // Build schedule field
    const lines: string[] = [
        `**Issued (Strike ${record.issuedLevel}):** <t:${Math.floor(record.issuedAt / 1000)}:F>`,
    ];

    if (record.issuedLevel === 3) {
        lines.push(
            `**→ Strike 2:** <t:${Math.floor((record.expiresAt - 30 * 24 * 60 * 60 * 1000) / 1000)}:F>`,
            `**→ Strike 1:** <t:${Math.floor((record.expiresAt - 7 * 24 * 60 * 60 * 1000) / 1000)}:F>`,
            `**→ Cleared:** <t:${Math.floor(record.expiresAt / 1000)}:F>`
        );
    } else if (record.issuedLevel === 2) {
        lines.push(
            `**→ Strike 1:** <t:${Math.floor((record.expiresAt - 7 * 24 * 60 * 60 * 1000) / 1000)}:F>`,
            `**→ Cleared:** <t:${Math.floor(record.expiresAt / 1000)}:F>`
        );
    } else {
        lines.push(
            `**→ Cleared:** <t:${Math.floor(record.expiresAt / 1000)}:F>`
        );
    }

    return new EmbedBuilder()
        .setTitle(`${emoji} Active Strike — Level ${lvl}`)
        .setColor(colors[lvl])
        .setThumbnail(targetUser.displayAvatarURL())
        .addFields(
            {
                name: 'User',
                value: `<@${targetUser.id}> (${targetUser.tag})`,
                inline: true,
            },
            {
                name: 'Current Level',
                value: `**${lvl}** (originally issued as **${record.issuedLevel}**)`,
                inline: true,
            },
            {
                name: 'Issued by',
                value: `<@${record.issuedBy}>`,
                inline: true,
            },
            {
                name: '⏱ Schedule',
                value: lines.join('\n'),
                inline: false,
            }
        )
        .setFooter({ text: `Time remaining: ${formatTimeRemaining(record)}` })
        .setTimestamp();
}

const checkStrikeCommand: Command = {
    name: 'checkstrike',
    description: 'Check the active strike for a user',
    requiredRoles: getAdvancedRoleIds(),
    data: new SlashCommandBuilder()
        .setName('checkstrike')
        .setDescription('Check the active strike for a user')
        .addStringOption((opt) =>
            opt
                .setName('user')
                .setDescription('User mention or Discord ID')
                .setRequired(true)
        ) as SlashCommandBuilder,

    executeSlash: async (interaction: ChatInputCommandInteraction) => {
        if (!interaction.guild) {
            await interaction.reply({
                content: '❌ This command can only be used in a server.',
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const targetStr = interaction.options.getString('user', true);
        const targetUser = await resolveUser(targetStr, (id) =>
            interaction.client.users.fetch(id)
        );

        if (!targetUser) {
            await interaction.editReply({
                content:
                    '❌ Could not find that user. Provide a valid mention or Discord ID.',
            });
            return;
        }

        const record = getStrike(targetUser.id);
        await interaction.editReply({
            embeds: [buildStrikeEmbed(targetUser, record)],
        });
    },

    executeText: async (message: Message, args: string[]) => {
        if (!message.guild) {
            await message.channel.send(
                '❌ This command can only be used in a server.'
            );
            return;
        }

        if (args.length < 1) {
            await message.channel.send(
                '❌ Usage: `!checkstrike <userID or @mention>`'
            );
            return;
        }

        const targetStr = args[0];
        const targetUser = await resolveUser(targetStr, (id) =>
            message.client.users.fetch(id)
        );

        if (!targetUser) {
            await message.channel.send(
                '❌ Could not find that user. Provide a valid mention or Discord ID.'
            );
            return;
        }

        const record = getStrike(targetUser.id);
        await message.channel.send({
            embeds: [buildStrikeEmbed(targetUser, record)],
        });
    },
};

export default checkStrikeCommand;
