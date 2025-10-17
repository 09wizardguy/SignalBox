export interface Application {
	userId: string;
	username: string;
	minecraftUsername: string;
	reason?: string;
	experience?: string;
	likeTrains?: string;
	status: ApplicationStatus;
	createdAt: number;
	messageId?: string; // ID of the approval message
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
	reason?: string;
	experience?: string;
	likeTrains?: string;
	status: ApplicationStatus;
	createdAt: number;
	messageId?: string;
}
