/**
 * Shared role sets used across multiple commands/handlers so that
 * related pieces of functionality stay in sync on who is authorized.
 */

// Roles allowed to manage the application system: posting the apply
// button, listing applications, and approving/rejecting applications.
// Keeping this in one place ensures all three stay tied to the same
// permission set instead of drifting independently.
export const APPLICATION_MANAGER_ROLE_IDS: string[] = [
    process.env.MC_MOD_ROLE_ID,
    process.env.MANAGER_ROLE_ID,
].filter((roleId): roleId is string => Boolean(roleId));
