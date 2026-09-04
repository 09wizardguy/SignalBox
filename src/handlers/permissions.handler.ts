import {
    ChatInputCommandInteraction,
    ButtonInteraction,
    ModalSubmitInteraction,
    Message,
    PermissionResolvable,
    GuildMember,
    EmbedBuilder,
} from 'discord.js';

type PermissionSource =
    | ChatInputCommandInteraction
    | ButtonInteraction
    | ModalSubmitInteraction
    | Message;

export async function checkPermissions(
    source: PermissionSource,
    requiredPerms: PermissionResolvable[]
): Promise<boolean> {
    const member =
        source instanceof Message
            ? (source.member as GuildMember)
            : (source.member as GuildMember);

    if (!member) return false;

    const missing = requiredPerms.filter(
        (perm) => !member.permissions.has(perm)
    );
    return missing.length === 0;
}

export async function checkRoles(
    source: PermissionSource,
    requiredRoles: string[]
): Promise<boolean> {
    const member =
        source instanceof Message
            ? (source.member as GuildMember)
            : (source.member as GuildMember);

    if (!member) return false;

    // Check if user has at least one of the required roles
    return requiredRoles.some((roleId) => member.roles.cache.has(roleId));
}

export async function sendNoPermission(
    source: ChatInputCommandInteraction | Message
) {
    const embed = new EmbedBuilder()
        .setTitle('Permission Denied')
        .setDescription('You do not have permission to use this command.')
        .setColor('Red');

    if (source instanceof Message) {
        const channel = source.channel;
        if (channel && 'send' in channel) {
            await channel.send({ embeds: [embed] });
        }
    } else if (source.isRepliable()) {
        await source.reply({ embeds: [embed], ephemeral: true });
    }
}

export async function sendNoRole(
    source: ChatInputCommandInteraction | Message
) {
    const embed = new EmbedBuilder()
        .setTitle('Access Denied')
        .setDescription(
            'You do not have the required role to use this command.'
        )
        .setColor('Red');

    if (source instanceof Message) {
        const channel = source.channel;
        if (channel && 'send' in channel) {
            await channel.send({ embeds: [embed] });
        }
    } else if (source.isRepliable()) {
        await source.reply({ embeds: [embed], ephemeral: true });
    }
}
