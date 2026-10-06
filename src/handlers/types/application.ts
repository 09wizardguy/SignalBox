export interface Application {
    userId: string;
    username: string;
    minecraftUsername: string;
    minecraftUUID?: string;
    isValidMinecraftAccount?: boolean;
    reason?: string;
    theme?: string;
    likeTrains?: string;
    status: ApplicationStatus;
    createdAt: number;
    rejectedAt?: number;
    messageId?: string;
    // Optional — only present once/if an approved application has been
    // retroactively revoked. Absent on all pre-existing records, which is
    // safe since these fields are optional.
    revokedAt?: number;
    revokedBy?: string;
    // Optional — set when a moderator explicitly waives the normal
    // reapply cooldown at reject/revoke time. Absent (false) on every
    // pre-existing record, which preserves today's standard-cooldown
    // behavior for all of them.
    instantReapply?: boolean;
}

export enum ApplicationStatus {
    PENDING = 'pending',
    APPROVED = 'approved',
    REJECTED = 'rejected',
    REVOKED = 'revoked',
}

export interface SerializedApplication {
    userId: string;
    username: string;
    minecraftUsername: string;
    minecraftUUID?: string;
    isValidMinecraftAccount?: boolean;
    reason?: string;
    theme?: string;
    likeTrains?: string;
    status: ApplicationStatus;
    createdAt: number;
    rejectedAt?: number;
    messageId?: string;
    revokedAt?: number;
    revokedBy?: string;
    instantReapply?: boolean;
}
