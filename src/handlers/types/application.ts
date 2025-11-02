export interface Application {
    userId: string;
    username: string;
    minecraftUsername: string;
    minecraftUUID?: string;
    isValidMinecraftAccount?: boolean;
    reason?: string;
    experience?: string;
    likeTrains?: string;
    status: ApplicationStatus;
    createdAt: number;
    messageId?: string;
}

export enum ApplicationStatus {
    PENDING = 'pending',
    APPROVED = 'approved',
    REJECTED = 'rejected',
}

export interface SerializedApplication {
    userId: string;
    username: string;
    minecraftUsername: string;
    minecraftUUID?: string;
    isValidMinecraftAccount?: boolean;
    reason?: string;
    experience?: string;
    likeTrains?: string;
    status: ApplicationStatus;
    createdAt: number;
    messageId?: string;
}
