import fs from 'fs';
import path from 'path';
import { Client, GuildMember } from 'discord.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StrikeRecord {
    userId: string;
    /**
     * The level this strike was originally issued at. Never mutated after
     * creation — used to drive the transition schedule correctly across
     * bot restarts.
     */
    issuedLevel: 1 | 2 | 3;
    /**
     * The level the user is currently on. Counts down as transitions fire.
     * Only the role matching this exact level is applied at any given time.
     */
    currentLevel: 1 | 2 | 3;
    /** Unix ms when the strike was issued */
    issuedAt: number;
    /** Unix ms when the strike fully expires and all roles are removed */
    expiresAt: number;
    issuedBy: string;
}

// ---------------------------------------------------------------------------
// Duration / threshold constants
//
// ONE role is active at a time — the role matching currentLevel exactly.
//
//   Strike 3 timeline (90 days total):
//     Day  0 → apply STRIKE_3_ROLE only
//     Day 60 → swap to STRIKE_2_ROLE only        (30 days remaining)
//     Day 83 → swap to STRIKE_1_ROLE only        ( 7 days remaining)
//     Day 90 → remove all strike roles
//
//   Strike 2 timeline (30 days total):
//     Day  0 → apply STRIKE_2_ROLE only
//     Day 23 → swap to STRIKE_1_ROLE only        ( 7 days remaining)
//     Day 30 → remove all strike roles
//
//   Strike 1 timeline (7 days total):
//     Day  0 → apply STRIKE_1_ROLE only
//     Day  7 → remove all strike roles
//
// Re-issue rules:
//   - New level > current issued level → full reset with new level & duration
//   - New level = current issued level → reset timer only (same level, fresh duration)
//   - New level < current issued level → full reset with new level & duration
//     (moderator explicitly downgraded; honour it)
// ---------------------------------------------------------------------------

const STRIKE_3_TOTAL_MS = 90 * 24 * 60 * 60 * 1000; // 90 days (strike 3)
const STRIKE_2_TOTAL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days (strike 2)
const STRIKE_1_TOTAL_MS = 7 * 24 * 60 * 60 * 1000; //  7 days (strike 1)
const TO_2_REMAINING_MS = 30 * 24 * 60 * 60 * 1000; // swap to strike 2 when 30 days remain
const TO_1_REMAINING_MS = 7 * 24 * 60 * 60 * 1000; // swap to strike 1 when  7 days remain

// ---------------------------------------------------------------------------
// In-memory store & Discord client reference
// ---------------------------------------------------------------------------

const strikes = new Map<string, StrikeRecord>();
const strikeTimers = new Map<string, NodeJS.Timeout[]>();

let _client: Client | null = null;

export function initStrikeManager(client: Client) {
    _client = client;
}

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

const STRIKES_FILE = path.join(process.cwd(), 'data', 'strikes.json');

function ensureDataDir() {
    const dir = path.dirname(STRIKES_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function saveStrikes() {
    try {
        ensureDataDir();
        const data: Record<string, StrikeRecord> = {};
        for (const [userId, record] of strikes.entries()) {
            data[userId] = { ...record }; // plain object — fully JSON-serializable
        }
        fs.writeFileSync(STRIKES_FILE, JSON.stringify(data, null, 2));
        console.log(`[StrikeManager] Saved ${strikes.size} strike(s) to disk.`);
    } catch (err) {
        console.error('[StrikeManager] Error saving strikes:', err);
    }
}

// ---------------------------------------------------------------------------
// Role helpers — ONE role active at a time
// ---------------------------------------------------------------------------

function getRoleIdForLevel(level: 1 | 2 | 3): string | undefined {
    switch (level) {
        case 1:
            return process.env.STRIKE_1_ROLE;
        case 2:
            return process.env.STRIKE_2_ROLE;
        case 3:
            return process.env.STRIKE_3_ROLE;
    }
}

/**
 * Removes all three strike roles from the member, then applies only the role
 * that matches `targetLevel` exactly.  Pass `null` to just clear all roles.
 *
 *   targetLevel 3 → STRIKE_3_ROLE only
 *   targetLevel 2 → STRIKE_2_ROLE only
 *   targetLevel 1 → STRIKE_1_ROLE only
 *   null           → no strike roles (strike cleared or expired)
 */
async function applyStrikeRole(
    guildId: string,
    userId: string,
    targetLevel: 1 | 2 | 3 | null
) {
    if (!_client) {
        console.error(
            '[StrikeManager] applyStrikeRole called before initStrikeManager'
        );
        return;
    }
    try {
        const guild =
            _client.guilds.cache.get(guildId) ??
            _client.guilds.cache.find((g) => g.members.cache.has(userId));

        if (!guild) {
            console.warn(`[StrikeManager] Guild ${guildId} not found in cache`);
            return;
        }

        const member: GuildMember | null = await guild.members
            .fetch(userId)
            .catch(() => null);

        if (!member) {
            console.warn(`[StrikeManager] Member ${userId} not found in guild`);
            return;
        }

        // Collect all three strike role IDs that are actually configured
        const allStrikeRoleIds = (
            [
                process.env.STRIKE_1_ROLE,
                process.env.STRIKE_2_ROLE,
                process.env.STRIKE_3_ROLE,
            ] as (string | undefined)[]
        ).filter((id): id is string => Boolean(id));

        // Strip every strike role currently on the member
        for (const roleId of allStrikeRoleIds) {
            if (member.roles.cache.has(roleId)) {
                await member.roles.remove(roleId).catch(console.error);
            }
        }

        // Apply only the single role for the target level
        if (targetLevel !== null) {
            const roleId = getRoleIdForLevel(targetLevel);
            if (roleId) {
                await member.roles.add(roleId).catch(console.error);
            }
        }

        console.log(
            `[StrikeManager] Applied ${targetLevel !== null ? `STRIKE_${targetLevel}_ROLE` : 'no strike role'} to ${userId}`
        );
    } catch (err) {
        console.error(`[StrikeManager] Role error for ${userId}:`, err);
    }
}

// ---------------------------------------------------------------------------
// Transition scheduling
//
// Transitions are always computed from `issuedLevel` + `expiresAt` so the
// schedule remains correct after a bot restart where `currentLevel` may
// already have been decremented.
// ---------------------------------------------------------------------------

function getTransitions(
    issuedLevel: 1 | 2 | 3,
    expiresAt: number
): Array<{ fireAt: number; newLevel: 1 | 2 | 3 | null }> {
    const t: Array<{ fireAt: number; newLevel: 1 | 2 | 3 | null }> = [];

    if (issuedLevel === 3) {
        t.push({ fireAt: expiresAt - TO_2_REMAINING_MS, newLevel: 2 }); // day 60
        t.push({ fireAt: expiresAt - TO_1_REMAINING_MS, newLevel: 1 }); // day 83
    } else if (issuedLevel === 2) {
        t.push({ fireAt: expiresAt - TO_1_REMAINING_MS, newLevel: 1 }); // day 83
    }
    // Strike 1 has no intermediate steps

    t.push({ fireAt: expiresAt, newLevel: null }); // final expiry
    return t;
}

function clearTimers(userId: string) {
    for (const t of strikeTimers.get(userId) ?? []) clearTimeout(t);
    strikeTimers.delete(userId);
}

/**
 * setTimeout silently breaks for delays above 2^31-1 ms (~24.8 days) because
 * the internal timer uses a signed 32-bit integer — an overflow causes the
 * callback to fire immediately.  This wrapper splits large delays into
 * chained timeouts that each stay within the safe limit.  All intermediate
 * handles are pushed to `handles` so clearTimers can cancel them at any point.
 */
const MAX_TIMEOUT_MS = 2_147_483_647; // 2^31 - 1

function safeSetTimeout(
    callback: () => void | Promise<void>,
    delay: number,
    handles: NodeJS.Timeout[]
): void {
    if (delay <= MAX_TIMEOUT_MS) {
        const t = setTimeout(callback, delay);
        handles.push(t);
        return;
    }
    const t = setTimeout(() => {
        safeSetTimeout(callback, delay - MAX_TIMEOUT_MS, handles);
    }, MAX_TIMEOUT_MS);
    handles.push(t);
}

function scheduleTransitions(record: StrikeRecord, guildId: string) {
    clearTimers(record.userId);
    const now = Date.now();
    const transitions = getTransitions(record.issuedLevel, record.expiresAt);

    // Register the array first so safeSetTimeout can push all handles into it
    const timers: NodeJS.Timeout[] = [];
    strikeTimers.set(record.userId, timers);

    for (const { fireAt, newLevel } of transitions) {
        const delay = fireAt - now;
        if (delay <= 0) continue; // already in the past — handled at load time

        safeSetTimeout(
            async () => {
                console.log(
                    `[StrikeManager] Transition: ${record.userId} → ${newLevel ?? 'cleared'}`
                );

                if (newLevel === null) {
                    strikes.delete(record.userId);
                } else {
                    const existing = strikes.get(record.userId);
                    if (existing) existing.currentLevel = newLevel;
                }

                saveStrikes();
                await applyStrikeRole(guildId, record.userId, newLevel);
            },
            delay,
            timers
        );
    }
}

// ---------------------------------------------------------------------------
// Catch-up: compute the correct current level after a bot restart
// ---------------------------------------------------------------------------

/**
 * Given the original issued level and expiry timestamp, returns what
 * `currentLevel` should be *right now* based on elapsed time.
 * Returns `null` if the strike has fully expired.
 */
function effectiveLevelNow(
    issuedLevel: 1 | 2 | 3,
    expiresAt: number
): 1 | 2 | 3 | null {
    const remaining = expiresAt - Date.now();
    if (remaining <= 0) return null;

    // Strike 1 has only one phase; it either hasn't expired or it has
    if (issuedLevel === 1) return 1;

    // Strike 2: transitions to level 1 when ≤ 7 days remain
    if (issuedLevel === 2) {
        return remaining <= TO_1_REMAINING_MS ? 1 : 2;
    }

    // Strike 3: 3 → 2 at 30 days remaining, 2 → 1 at 7 days remaining
    if (remaining <= TO_1_REMAINING_MS) return 1;
    if (remaining <= TO_2_REMAINING_MS) return 2;
    return 3;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Issue a strike for a user.
 *
 * Re-issue behaviour when the user already has an active strike:
 *   - New level > existing issuedLevel → full reset: new level, fresh duration
 *   - New level = existing issuedLevel → timer reset only: same level, fresh duration
 *   - New level < existing issuedLevel → full reset: new (lower) level, fresh duration
 *     (moderator has explicitly chosen to downgrade; honour their decision)
 *
 * In all re-issue cases the old timers are cancelled before the new record
 * is created, so there is never a stale timer firing after a re-issue.
 */
export async function issueStrike(
    userId: string,
    level: 1 | 2 | 3,
    issuedBy: string,
    guildId: string
): Promise<StrikeRecord> {
    // Cancel any timers from a prior strike
    clearTimers(userId);

    const now = Date.now();
    const totalMs =
        level === 1
            ? STRIKE_1_TOTAL_MS
            : level === 2
              ? STRIKE_2_TOTAL_MS
              : STRIKE_3_TOTAL_MS;

    const record: StrikeRecord = {
        userId,
        issuedLevel: level,
        currentLevel: level,
        issuedAt: now,
        expiresAt: now + totalMs,
        issuedBy,
    };

    strikes.set(userId, record);
    saveStrikes();

    // Apply only the role for the issued level
    await applyStrikeRole(guildId, userId, level);

    // Schedule all future role transitions
    scheduleTransitions(record, guildId);

    return record;
}

/**
 * Immediately remove a user's strike and strip all strike roles.
 */
export async function removeStrike(
    userId: string,
    guildId: string
): Promise<boolean> {
    if (!strikes.has(userId)) return false;

    clearTimers(userId);
    strikes.delete(userId);
    saveStrikes();

    await applyStrikeRole(guildId, userId, null);
    return true;
}

/** Return the active strike record for a user, or null if they have none. */
export function getStrike(userId: string): StrikeRecord | null {
    return strikes.get(userId) ?? null;
}

/** Return all active strike records. */
export function getAllStrikes(): StrikeRecord[] {
    return Array.from(strikes.values());
}

/**
 * Load persisted strikes on bot startup.
 * Corrects any roles that changed while the bot was offline, then reschedules
 * all remaining transitions.
 */
export async function loadStrikes(guildId: string) {
    try {
        ensureDataDir();

        if (!fs.existsSync(STRIKES_FILE)) {
            console.log(
                '[StrikeManager] No strikes file found, starting fresh.'
            );
            return;
        }

        const raw = fs.readFileSync(STRIKES_FILE, 'utf-8').trim();
        if (!raw || raw === '{}') {
            console.log('[StrikeManager] Strikes file is empty.');
            return;
        }

        const data: Record<string, StrikeRecord> = JSON.parse(raw);
        let loaded = 0;

        for (const [userId, record] of Object.entries(data)) {
            // Migrate records written before the issuedLevel/currentLevel split
            if (!(record as any).issuedLevel) {
                (record as any).issuedLevel = (record as any).level ?? 1;
                (record as any).currentLevel = (record as any).level ?? 1;
            }

            const correctLevel = effectiveLevelNow(
                record.issuedLevel,
                record.expiresAt
            );

            if (correctLevel === null) {
                // Expired while bot was offline — clean up roles and skip
                console.log(
                    `[StrikeManager] Strike for ${userId} expired offline, removing roles.`
                );
                await applyStrikeRole(guildId, userId, null);
                continue;
            }

            // Update currentLevel to reflect any transitions that fired offline
            record.currentLevel = correctLevel;
            strikes.set(userId, record);

            // Ensure the member has exactly the right single role right now
            await applyStrikeRole(guildId, userId, correctLevel);

            // Reschedule remaining transitions (always from issuedLevel, not currentLevel)
            scheduleTransitions(record, guildId);
            loaded++;
        }

        // Persist any corrections (expired records removed, levels corrected)
        saveStrikes();
        console.log(
            `[StrikeManager] Loaded and scheduled ${loaded} active strike(s).`
        );
    } catch (err) {
        console.error('[StrikeManager] Error loading strikes:', err);
        try {
            fs.writeFileSync(STRIKES_FILE, '{}');
        } catch (_) {}
    }
}

/**
 * Returns a human-readable string for the time remaining on a strike.
 * e.g. "83d 4h 12m"
 */
export function formatTimeRemaining(record: StrikeRecord): string {
    const ms = record.expiresAt - Date.now();
    if (ms <= 0) return 'Expired';

    const days = Math.floor(ms / (24 * 60 * 60 * 1000));
    const hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));

    const parts: string[] = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    return parts.join(' ') || '<1m';
}
