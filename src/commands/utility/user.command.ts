import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    Message,
    EmbedBuilder,
    User,
    GuildMember,
    MessageFlags,
} from 'discord.js';
import { Command } from '../../handlers/types/command';
import { getMemberInviteInfo } from '../../handlers/inviteTracker';

async function createUserEmbed(user: User, member: GuildMember | null) {
    const embed = new EmbedBuilder()
        .setTitle('User Information')
        .setColor('#5865F2')
        .setThumbnail(user.displayAvatarURL({ size: 256 }))
        .addFields(
            {
                name: '📝 Display Name',
                value: member?.displayName || user.displayName,
                inline: true,
            },
            {
                name: '👤 Username',
                value: user.username,
                inline: true,
            },
            {
                name: '🆔 User ID',
                value: user.id,
                inline: true,
            },
            {
                name: '📅 Account Created',
                value: `<t:${Math.floor(
                    user.createdTimestamp / 1000
                )}:F>\n(<t:${Math.floor(user.createdTimestamp / 1000)}:R>)`,
                inline: false,
            }
        );

    if (member) {
        // User is in the server
        embed.addFields({
            name: '📥 Joined Server',
            value: member.joinedAt
                ? `<t:${Math.floor(
                      member.joinedAt.getTime() / 1000
                  )}:F>\n(<t:${Math.floor(member.joinedAt.getTime() / 1000)}:R>)`
                : 'Unknown',
            inline: false,
        });

        // Check for invite information
        const inviteInfo = getMemberInviteInfo(user.id);
        if (inviteInfo) {
            embed.addFields({
                name: '🔗 Invite Information',
                value: `**Code:** \`${inviteInfo.inviteCode}\`\n**Created by:** <@${inviteInfo.inviterId}> (${inviteInfo.inviterTag})`,
                inline: false,
            });
        }

        // Get roles (exclude @everyone)
        const roles = member.roles.cache
            .filter((role) => role.id !== member.guild.id)
            .sort((a, b) => b.position - a.position)
            .map((role) => role.toString());

        if (roles.length > 0) {
            embed.addFields({
                name: `🎭 Roles [${roles.length}]`,
                value: roles.join(', ') || 'None',
                inline: false,
            });
        }
    } else {
        embed.addFields({
            name: '📥 Server Status',
            value: 'Not in this server',
            inline: false,
        });
    }

    return embed;
}

const userCommand: Command = {
    name: 'user',
    description: 'Provides info about a user',
    requiredRoles: [process.env.BASIC_COMMANDS_ROLE_ID!],
    data: new SlashCommandBuilder()
        .setName('user')
        .setDescription('Info about a user')
        .addStringOption((option) =>
            option
                .setName('target')
                .setDescription('The user to look up (mention or ID)')
                .setRequired(false)
        ) as SlashCommandBuilder,
    executeSlash: async (interaction: ChatInputCommandInteraction) => {
        const targetInput = interaction.options.getString('target');
        let target: User;

        if (targetInput) {
            // Try to parse mention or use as ID
            const userId = targetInput.replace(/[<@!>]/g, '');
            try {
                target = await interaction.client.users.fetch(userId);
            } catch (error) {
                await interaction.reply({
                    content:
                        '❌ Could not find that user. Please provide a valid user mention or ID.',
                    flags: MessageFlags.Ephemeral,
                });
                return;
            }
        } else {
            target = interaction.user;
        }

        const member = interaction.guild
            ? await interaction.guild.members.fetch(target.id).catch(() => null)
            : null;

        const embed = await createUserEmbed(target, member);
        await interaction.reply({ embeds: [embed] });
    },
    executeText: async (message: Message, args: string[]) => {
        let target: User;
        const channel = message.channel;
        if (!('send' in channel)) return;

        if (args.length > 0) {
            // Check for mention first
            if (message.mentions.users.size > 0) {
                target = message.mentions.users.first()!;
            } else {
                // Try to fetch by ID
                const userId = args[0].replace(/[<@!>]/g, '');
                try {
                    target = await message.client.users.fetch(userId);
                } catch (error) {
                    await channel.send(
                        '❌ Could not find that user. Please provide a valid user mention or ID.'
                    );
                    return;
                }
            }
        } else {
            target = message.author;
        }

        const member = message.guild
            ? await message.guild.members.fetch(target.id).catch(() => null)
            : null;

        const embed = await createUserEmbed(target, member);
        await channel.send({ embeds: [embed] });
    },
};

export default userCommand;
