import 'dotenv/config';

import fs from 'fs/promises';
import path from 'path';

import { MySqlPersistenceProvider } from './mysqlPersistence';

import { PersistenceCollection } from './types';

import type { Application } from '../../handlers/types/application';

import type { StrikeRecord } from '../strikeManager';

interface SerializedReminder {
    message: string;
    createdAt: number;
    expiresAt: number;
}

interface MemberInviteInfo {
    inviteCode: string;
    inviterId: string;
    inviterTag: string;
    joinedAt: number;
}

async function readJsonObject<T>(filePath: string): Promise<Record<string, T>> {
    try {
        const content = await fs.readFile(filePath, 'utf-8');

        const trimmed = content.trim();

        if (!trimmed) {
            return {};
        }

        const parsed: unknown = JSON.parse(trimmed);

        if (
            typeof parsed !== 'object' ||
            parsed === null ||
            Array.isArray(parsed)
        ) {
            throw new Error(`${filePath} must contain a JSON object.`);
        }

        return parsed as Record<string, T>;
    } catch (error) {
        if (
            error instanceof Error &&
            'code' in error &&
            error.code === 'ENOENT'
        ) {
            return {};
        }

        throw error;
    }
}

function getMySqlProvider(): MySqlPersistenceProvider {
    const host = process.env.MYSQL_HOST;

    if (!host) {
        throw new Error('MYSQL_HOST is required.');
    }

    const port = Number(process.env.MYSQL_PORT ?? 3306);

    const database = process.env.MYSQL_DATABASE;

    const user = process.env.MYSQL_USER;

    const password = process.env.MYSQL_PASSWORD ?? '';

    if (!database) {
        throw new Error('MYSQL_DATABASE is required.');
    }

    if (!user) {
        throw new Error('MYSQL_USER is required.');
    }

    if (!Number.isInteger(port) || port <= 0) {
        throw new Error('MYSQL_PORT must be a valid positive integer.');
    }

    return new MySqlPersistenceProvider({
        host,
        port,
        database,
        user,
        password,
    });
}

async function main(): Promise<void> {
    console.log('[Migration] Starting JSON → MySQL migration...');

    const provider = getMySqlProvider();

    try {
        await provider.initialize();

        const dataDirectory = path.join(process.cwd(), 'data');

        const applications = await readJsonObject<Application>(
            path.join(dataDirectory, 'applications.json')
        );

        const strikes = await readJsonObject<StrikeRecord>(
            path.join(dataDirectory, 'strikes.json')
        );

        const reminders = await readJsonObject<SerializedReminder[]>(
            path.join(dataDirectory, 'reminders.json')
        );

        const invites = await readJsonObject<MemberInviteInfo>(
            path.join(dataDirectory, 'invites.json')
        );

        console.log(
            `[Migration] Found ${Object.keys(applications).length} application(s).`
        );

        console.log(
            `[Migration] Found ${Object.keys(strikes).length} strike(s).`
        );

        console.log(
            `[Migration] Found ${Object.keys(reminders).length} user(s) with reminders.`
        );

        console.log(
            `[Migration] Found ${Object.keys(invites).length} invite record(s).`
        );

        let migratedApplications = 0;
        let migratedStrikes = 0;
        let migratedReminders = 0;
        let migratedInvites = 0;

        for (const [userId, application] of Object.entries(applications)) {
            await provider.set(
                PersistenceCollection.Applications,
                userId,
                application
            );

            migratedApplications++;
        }

        for (const [userId, strike] of Object.entries(strikes)) {
            await provider.set(PersistenceCollection.Strikes, userId, strike);

            migratedStrikes++;
        }

        for (const [userId, userReminders] of Object.entries(reminders)) {
            await provider.set(
                PersistenceCollection.Reminders,
                userId,
                userReminders
            );

            migratedReminders++;
        }

        for (const [userId, inviteInfo] of Object.entries(invites)) {
            await provider.set(
                PersistenceCollection.Invites,
                userId,
                inviteInfo
            );

            migratedInvites++;
        }

        console.log(
            `[Migration] Migrated ${migratedApplications} application(s).`
        );

        console.log(`[Migration] Migrated ${migratedStrikes} strike(s).`);

        console.log(
            `[Migration] Migrated ${migratedReminders} reminder record(s).`
        );

        console.log(
            `[Migration] Migrated ${migratedInvites} invite record(s).`
        );

        console.log('[Migration] Migration complete.');
    } finally {
        await provider.close();
    }
}

main().catch((error) => {
    console.error('[Migration] Migration failed:', error);

    process.exitCode = 1;
});
