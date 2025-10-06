import { Client, Collection, Guild, Invite, GuildMember } from 'discord.js';
import fs from 'fs';
import path from 'path';

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
const memberInvites = new Map<string, MemberInviteInfo>(); // userId -> invite info
const INVITES_FILE = path.join(process.cwd(), 'data', 'invites.json');

/**
 * Ensure the data directory exists
 */
function ensureDataDir() {
	const dir = path.dirname(INVITES_FILE);
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, { recursive: true });
	}
}

/**
 * Save member invite data to JSON
 */
function saveMemberInvites() {
	try {
		ensureDataDir();
		const data: Record<string, MemberInviteInfo> = {};

		for (const [userId, info] of memberInvites.entries()) {
			data[userId] = info;
		}

		fs.writeFileSync(INVITES_FILE, JSON.stringify(data, null, 2));
	} catch (error) {
		console.error('Error saving invite data:', error);
	}
}

/**
 * Load member invite data from JSON
 */
function loadMemberInvites() {
	try {
		ensureDataDir();

		if (!fs.existsSync(INVITES_FILE)) {
			console.log('No invite data file found, starting fresh.');
			return;
		}

		const data = JSON.parse(fs.readFileSync(INVITES_FILE, 'utf-8'));

		for (const [userId, info] of Object.entries(data)) {
			memberInvites.set(userId, info as MemberInviteInfo);
		}

		console.log(`Loaded invite data for ${memberInvites.size} members.`);
	} catch (error) {
		console.error('Error loading invite data:', error);
	}
}

/**
 * Cache all invites for a guild
 */
async function cacheGuildInvites(guild: Guild) {
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
 * Initialize invite tracking for all guilds
 */
export async function initializeInviteTracking(client: Client) {
	console.log('Starting invite tracking initialization...');
	loadMemberInvites();

	for (const guild of client.guilds.cache.values()) {
		console.log(`Caching invites for guild: ${guild.name}`);
		await cacheGuildInvites(guild);
	}

	console.log(
		`Invite tracking initialized. Loaded data for ${memberInvites.size} members.`
	);
}

/**
 * Handle new member join - detect which invite was used
 */
export async function handleMemberJoin(member: GuildMember) {
	try {
		console.log(`New member joined: ${member.user.tag}`);
		const guild = member.guild;
		const cachedInvites = guildInvites.get(guild.id);

		if (!cachedInvites) {
			console.log('No cached invites found, caching now...');
			await cacheGuildInvites(guild);
			return;
		}

		const newInvites = await guild.invites.fetch();

		// Find which invite had its uses increased
		const usedInvite = newInvites.find((invite) => {
			const cached = cachedInvites.get(invite.code);
			return cached && invite.uses! > cached.uses;
		});

		if (usedInvite && usedInvite.inviter) {
			// Store the invite information
			memberInvites.set(member.id, {
				inviteCode: usedInvite.code,
				inviterId: usedInvite.inviter.id,
				inviterTag: usedInvite.inviter.tag,
				joinedAt: Date.now(),
			});

			saveMemberInvites();

			console.log(
				`${member.user.tag} joined using invite ${usedInvite.code} from ${usedInvite.inviter.tag}`
			);
		} else {
			console.log(`Could not determine invite used by ${member.user.tag}`);
		}

		// Update cache
		await cacheGuildInvites(guild);
	} catch (error) {
		console.error('Error tracking invite:', error);
	}
}

/**
 * Handle invite creation
 */
export async function handleInviteCreate(invite: Invite) {
	if (!invite.guild) return;

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
 * Handle invite deletion
 */
export async function handleInviteDelete(invite: Invite) {
	if (!invite.guild) return;

	const cachedInvites = guildInvites.get(invite.guild.id);
	if (cachedInvites) {
		cachedInvites.delete(invite.code);
	}

	// Note: We don't remove member invite data when invites are deleted
	// so that historical invite information remains available in user lookups
}

/**
 * Get invite info for a member
 */
export function getMemberInviteInfo(userId: string): MemberInviteInfo | null {
	const info = memberInvites.get(userId) || null;
	console.log(`getMemberInviteInfo called for ${userId}:`, info);
	return info;
}
