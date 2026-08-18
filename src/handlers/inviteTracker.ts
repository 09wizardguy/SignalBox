import { Client, Collection, Guild, Invite, GuildMember } from 'discord.js';

import { getPersistence, PersistenceCollection } from '../services/persistence';

interface InviteData {
    code: string;
    inviterId: string;
    inviterTag: string;
    uses: number;
}

interface MemberInviteInfo {
    inviteCode: string;
    inviterId: string;
    inviterTag: string;
    joinedAt: number;
}

const guildInvites = new Collection<string, Collection<string, InviteData>>();

const memberInvites = new Map<string, MemberInviteInfo>();

/**
 * Save member invite data using the configured persistence provider.
 */
async function saveMemberInvite(
    userId: string,
    info: MemberInviteInfo
): Promise<void> {
    await getPersistence().set(PersistenceCollection.Invites, userId, info);
}

/**
 * Load member invite data.
 */
async function loadMemberInvites(): Promise<void> {
    const entries = await getPersistence().getAllEntries<MemberInviteInfo>(
        PersistenceCollection.Invites
    );

    memberInvites.clear();

    for (const [userId, info] of entries) {
        memberInvites.set(userId, info);
    }

    console.log(`Loaded invite data for ${memberInvites.size} members.`);
}

/**
 * Cache all invites for a guild.
 */
async function cacheGuildInvites(guild: Guild): Promise<void> {
    try {
        const invites = await guild.invites.fetch();

        const inviteCache = new Collection<string, InviteData>();

        invites.forEach((invite) => {
            inviteCache.set(invite.code, {
                code: invite.code,
                inviterId: invite.inviter?.id || 'Unknown',
                inviterTag: invite.inviter?.tag || 'Unknown',
                uses: invite.uses || 0,
            });
        });

        guildInvites.set(guild.id, inviteCache);
    } catch (error) {
        console.error(`Failed to cache invites for guild ${guild.id}:`, error);
    }
}

/**
 * Initialize invite tracking for all guilds.
 */
export async function initializeInviteTracking(client: Client): Promise<void> {
    await loadMemberInvites();

    for (const guild of client.guilds.cache.values()) {
        await cacheGuildInvites(guild);
    }

    console.log('Invite tracking initialized.');
}

/**
 * Handle new member join - detect which invite was used.
 */
export async function handleMemberJoin(member: GuildMember): Promise<void> {
    try {
        const guild = member.guild;

        const cachedInvites = guildInvites.get(guild.id);

        if (!cachedInvites) {
            await cacheGuildInvites(guild);

            return;
        }

        const newInvites = await guild.invites.fetch();

        const usedInvite = newInvites.find((invite) => {
            const cached = cachedInvites.get(invite.code);

            return cached && invite.uses! > cached.uses;
        });

        if (usedInvite && usedInvite.inviter) {
            const info: MemberInviteInfo = {
                inviteCode: usedInvite.code,
                inviterId: usedInvite.inviter.id,
                inviterTag: usedInvite.inviter.tag,
                joinedAt: Date.now(),
            };

            memberInvites.set(member.id, info);

            await saveMemberInvite(member.id, info);
        }

        await cacheGuildInvites(guild);
    } catch (error) {
        console.error('Error tracking invite:', error);
    }
}

/**
 * Handle invite creation.
 */
export async function handleInviteCreate(invite: Invite): Promise<void> {
    if (!invite.guild) {
        return;
    }

    const cachedInvites = guildInvites.get(invite.guild.id);

    if (cachedInvites && invite.inviter) {
        cachedInvites.set(invite.code, {
            code: invite.code,
            inviterId: invite.inviter.id,
            inviterTag: invite.inviter.tag,
            uses: invite.uses || 0,
        });
    }
}

/**
 * Handle invite deletion.
 */
export async function handleInviteDelete(invite: Invite): Promise<void> {
    if (!invite.guild) {
        return;
    }

    const cachedInvites = guildInvites.get(invite.guild.id);

    if (cachedInvites) {
        cachedInvites.delete(invite.code);
    }

    // We intentionally don't remove member invite data.
    // Historical invite information remains available.
}

/**
 * Get invite info for a member.
 */
export function getMemberInviteInfo(userId: string): MemberInviteInfo | null {
    return memberInvites.get(userId) || null;
}
