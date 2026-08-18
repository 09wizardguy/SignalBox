import fs from 'fs/promises';
import path from 'path';
import { PersistenceCollection, PersistenceProvider } from './types';

type JsonStore = Record<string, unknown>;

export class JsonPersistenceProvider implements PersistenceProvider {
    private readonly dataDirectory: string;

    private readonly files: Record<PersistenceCollection, string> = {
        applications: 'applications.json',
        strikes: 'strikes.json',
        reminders: 'reminders.json',
        invites: 'invites.json',
    };

    constructor(dataDirectory = path.join(process.cwd(), 'data')) {
        this.dataDirectory = dataDirectory;
    }

    async initialize(): Promise<void> {
        await fs.mkdir(this.dataDirectory, { recursive: true });

        for (const collection of Object.keys(
            this.files
        ) as PersistenceCollection[]) {
            const filePath = this.getFilePath(collection);

            try {
                await fs.access(filePath);
            } catch {
                await this.writeStore(collection, {});
            }
        }
    }

    async get<T>(
        collection: PersistenceCollection,
        key: string
    ): Promise<T | null> {
        const store = await this.readStore(collection);

        return (store[key] as T | undefined) ?? null;
    }

    async getAll<T>(collection: PersistenceCollection): Promise<T[]> {
        const store = await this.readStore(collection);

        return Object.values(store) as T[];
    }

    async getAllEntries<T>(
        collection: PersistenceCollection
    ): Promise<Array<[string, T]>> {
        const store = await this.readStore(collection);

        return Object.entries(store) as Array<[string, T]>;
    }

    async set<T>(
        collection: PersistenceCollection,
        key: string,
        value: T
    ): Promise<void> {
        const store = await this.readStore(collection);

        store[key] = value;

        await this.writeStore(collection, store);
    }

    async delete(
        collection: PersistenceCollection,
        key: string
    ): Promise<boolean> {
        const store = await this.readStore(collection);

        if (!(key in store)) {
            return false;
        }

        delete store[key];

        await this.writeStore(collection, store);

        return true;
    }

    async close(): Promise<void> {
        // JSON persistence has no resources to close.
    }

    private getFilePath(collection: PersistenceCollection): string {
        return path.join(this.dataDirectory, this.files[collection]);
    }

    private async readStore(
        collection: PersistenceCollection
    ): Promise<JsonStore> {
        const filePath = this.getFilePath(collection);

        try {
            const fileContent = await fs.readFile(filePath, 'utf-8');

            const trimmed = fileContent.trim();

            if (!trimmed) {
                return {};
            }

            const parsed: unknown = JSON.parse(trimmed);

            if (
                typeof parsed !== 'object' ||
                parsed === null ||
                Array.isArray(parsed)
            ) {
                throw new Error(
                    `Expected ${filePath} to contain a JSON object.`
                );
            }

            return parsed as JsonStore;
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

    private async writeStore(
        collection: PersistenceCollection,
        store: JsonStore
    ): Promise<void> {
        const filePath = this.getFilePath(collection);

        await fs.mkdir(this.dataDirectory, { recursive: true });

        await fs.writeFile(filePath, JSON.stringify(store, null, 2), 'utf-8');
    }
}
