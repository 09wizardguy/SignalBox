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
}

export enum ApplicationStatus {
    PENDING = 'pending',
    APPROVED = 'approved',
    REJECTED = 'rejected',
    // Added for the revoke-application retrofit. This is purely additive —
    // existing persisted records only ever contain the three values above,
    // and nothing reads/writes REVOKED unless explicitly revoked.
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
}
