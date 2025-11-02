import fs from 'fs';
import path from 'path';
import {
    Application,
    ApplicationStatus,
    SerializedApplication,
} from '../handlers/types/application';

const applications = new Map<string, Application>();
const APPLICATIONS_FILE = path.join(process.cwd(), 'data', 'applications.json');

/**
 * Ensure the data directory exists
 */
function ensureDataDir() {
    const dir = path.dirname(APPLICATIONS_FILE);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

/**
 * Save applications to JSON file
 */
function saveApplications() {
    try {
        ensureDataDir();
        const data: Record<string, SerializedApplication> = {};

        for (const [userId, app] of applications.entries()) {
            data[userId] = {
                userId: app.userId,
                username: app.username,
                minecraftUsername: app.minecraftUsername,
                minecraftUUID: app.minecraftUUID,
                isValidMinecraftAccount: app.isValidMinecraftAccount,
                reason: app.reason,
                experience: app.experience,
                likeTrains: app.likeTrains,
                status: app.status,
                createdAt: app.createdAt,
                messageId: app.messageId,
            };
        }

        fs.writeFileSync(APPLICATIONS_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error saving applications:', error);
    }
}

/**
 * Load applications from JSON file
 */
export function loadApplications() {
    try {
        ensureDataDir();

        if (!fs.existsSync(APPLICATIONS_FILE)) {
            console.log('No applications file found, starting fresh.');
            return;
        }

        const fileContent = fs.readFileSync(APPLICATIONS_FILE, 'utf-8').trim();

        // Check if file is empty or only contains whitespace
        if (!fileContent) {
            console.log('Applications file is empty, starting fresh.');
            // Initialize with empty object
            fs.writeFileSync(APPLICATIONS_FILE, '{}');
            return;
        }

        const data = JSON.parse(fileContent);

        for (const [userId, app] of Object.entries(data)) {
            applications.set(userId, app as Application);
        }

        console.log(`Loaded ${applications.size} applications.`);
    } catch (error) {
        console.error('Error loading applications:', error);
        console.log('Creating fresh applications file...');
        // Reset file with empty object if corrupted
        try {
            fs.writeFileSync(APPLICATIONS_FILE, '{}');
        } catch (writeError) {
            console.error(
                'Could not create fresh applications file:',
                writeError
            );
        }
    }
}

/**
 * Create a new application
 */
export function createApplication(
    userId: string,
    username: string,
    minecraftUsername: string,
    minecraftUUID?: string,
    isValidMinecraftAccount?: boolean,
    reason?: string,
    experience?: string,
    likeTrains?: string
): Application {
    const application: Application = {
        userId,
        username,
        minecraftUsername,
        minecraftUUID,
        isValidMinecraftAccount,
        reason,
        experience,
        likeTrains,
        status: ApplicationStatus.PENDING,
        createdAt: Date.now(),
    };

    applications.set(userId, application);
    saveApplications();
    return application;
}

/**
 * Get application by user ID
 */
export function getApplication(userId: string): Application | null {
    return applications.get(userId) || null;
}

/**
 * Get all applications, optionally filtered by status
 */
export function getAllApplications(status?: ApplicationStatus): Application[] {
    const allApps = Array.from(applications.values());

    if (status) {
        return allApps.filter((app) => app.status === status);
    }

    return allApps;
}

/**
 * Update application status
 */
export function updateApplicationStatus(
    userId: string,
    status: ApplicationStatus
): boolean {
    const application = applications.get(userId);

    if (!application) {
        return false;
    }

    application.status = status;
    saveApplications();
    return true;
}

/**
 * Update application message ID
 */
export function updateApplicationMessageId(
    userId: string,
    messageId: string
): boolean {
    const application = applications.get(userId);

    if (!application) {
        return false;
    }

    application.messageId = messageId;
    saveApplications();
    return true;
}

/**
 * Delete an application
 */
export function deleteApplication(userId: string): boolean {
    const deleted = applications.delete(userId);

    if (deleted) {
        saveApplications();
    }

    return deleted;
}
