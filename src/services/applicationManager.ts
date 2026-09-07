import {
    Application,
    ApplicationStatus,
    SerializedApplication,
} from '../handlers/types/application';

import { getPersistence, PersistenceCollection } from './persistence';

const applications = new Map<string, Application>();

/**
 * Save a single application using the configured persistence provider.
 */
async function saveApplication(application: Application): Promise<void> {
    const serialized: SerializedApplication = {
        userId: application.userId,
        username: application.username,
        minecraftUsername: application.minecraftUsername,
        minecraftUUID: application.minecraftUUID,
        isValidMinecraftAccount: application.isValidMinecraftAccount,
        reason: application.reason,
        theme: application.theme,
        likeTrains: application.likeTrains,
        status: application.status,
        createdAt: application.createdAt,
        rejectedAt: application.rejectedAt,
        messageId: application.messageId,
        revokedAt: application.revokedAt,
        revokedBy: application.revokedBy,
    };

    await getPersistence().set(
        PersistenceCollection.Applications,
        application.userId,
        serialized
    );
}

/**
 * Load applications from the configured persistence provider.
 */
export async function loadApplications(): Promise<void> {
    try {
        const entries =
            await getPersistence().getAllEntries<SerializedApplication>(
                PersistenceCollection.Applications
            );

        applications.clear();

        for (const [userId, app] of entries) {
            applications.set(userId, app as Application);
        }

        if (applications.size === 0) {
            console.log('No applications found, starting fresh.');

            return;
        }

        console.log(`Loaded ${applications.size} applications.`);
    } catch (error) {
        console.error('Error loading applications:', error);

        throw error;
    }
}

/**
 * Create a new application.
 */
export async function createApplication(
    userId: string,
    username: string,
    minecraftUsername: string,
    minecraftUUID?: string,
    isValidMinecraftAccount?: boolean,
    reason?: string,
    theme?: string,
    likeTrains?: string
): Promise<Application> {
    const application: Application = {
        userId,
        username,
        minecraftUsername,
        minecraftUUID,
        isValidMinecraftAccount,
        reason,
        theme,
        likeTrains,
        status: ApplicationStatus.PENDING,
        createdAt: Date.now(),
    };

    applications.set(userId, application);

    await saveApplication(application);

    return application;
}

/**
 * Get application by user ID.
 */
export function getApplication(userId: string): Application | null {
    return applications.get(userId) || null;
}

/**
 * Get all applications, optionally filtered by status.
 */
export function getAllApplications(status?: ApplicationStatus): Application[] {
    const allApps = Array.from(applications.values());

    if (status) {
        return allApps.filter((app) => app.status === status);
    }

    return allApps;
}

/**
 * Update application status.
 */
export async function updateApplicationStatus(
    userId: string,
    status: ApplicationStatus
): Promise<boolean> {
    const application = applications.get(userId);

    if (!application) {
        return false;
    }

    application.status = status;

    if (status === ApplicationStatus.REJECTED) {
        application.rejectedAt = Date.now();
    }

    await saveApplication(application);

    return true;
}

/**
 * Revoke a previously approved application.
 *
 * This is a dedicated function (rather than reusing updateApplicationStatus)
 * so that callers of updateApplicationStatus are completely unaffected, and
 * so we can record who performed the revocation alongside when it happened.
 *
 * Returns null if there is no application on record for the user, or if the
 * application is not currently APPROVED (revoking a pending/rejected/already
 * -revoked application doesn't make sense and is rejected here so callers
 * don't have to duplicate that check).
 */
export async function revokeApplication(
    userId: string,
    revokedBy?: string
): Promise<Application | null> {
    const application = applications.get(userId);

    if (!application) {
        return null;
    }

    if (application.status !== ApplicationStatus.APPROVED) {
        return null;
    }

    application.status = ApplicationStatus.REVOKED;
    application.revokedAt = Date.now();
    application.revokedBy = revokedBy;

    await saveApplication(application);

    return application;
}

/**
 * Update application message ID.
 */
export async function updateApplicationMessageId(
    userId: string,
    messageId: string
): Promise<boolean> {
    const application = applications.get(userId);

    if (!application) {
        return false;
    }

    application.messageId = messageId;

    await saveApplication(application);

    return true;
}

/**
 * Delete an application.
 */
export async function deleteApplication(userId: string): Promise<boolean> {
    const deleted = applications.delete(userId);

    if (!deleted) {
        return false;
    }

    await getPersistence().delete(PersistenceCollection.Applications, userId);

    return true;
}
