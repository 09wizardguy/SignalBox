/**
 * How long a rejected/revoked applicant must wait before they can reapply,
 * unless a moderator explicitly grants an instant reapply at reject/revoke
 * time. Shared across the reject flow, the revoke flow, and the apply
 * button's cooldown check so they can't drift out of sync with each other.
 *
 * This value is only ever read at check-time - it is never persisted
 * per-application - so changing it and restarting the bot immediately takes
 * effect for every existing rejected/revoked application too. No data
 * migration needed.
 */
export const REAPPLY_COOLDOWN_MS = 2 * 24 * 60 * 60 * 1000;
