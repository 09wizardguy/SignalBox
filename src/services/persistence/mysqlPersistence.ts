import mysql, { Pool, ResultSetHeader, RowDataPacket } from 'mysql2/promise';

import { PersistenceCollection, PersistenceProvider } from './types';

interface PersistenceRow extends RowDataPacket {
    record_key: string;
    record_data: string;
}

export interface MySqlPersistenceOptions {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
}

export class MySqlPersistenceProvider implements PersistenceProvider {
    private readonly pool: Pool;

    constructor(options: MySqlPersistenceOptions) {
        this.pool = mysql.createPool({
            host: options.host,
            port: options.port,
            database: options.database,
            user: options.user,
            password: options.password,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0,
        });
    }

    async initialize(): Promise<void> {
        const connection = await this.pool.getConnection();

        try {
            await connection.ping();

            await connection.query(`
                CREATE TABLE IF NOT EXISTS signalbox_applications (
                    record_key VARCHAR(255) NOT NULL,
                    record_data JSON NOT NULL,
                    PRIMARY KEY (record_key)
                )
            `);

            await connection.query(`
                CREATE TABLE IF NOT EXISTS signalbox_strikes (
                    record_key VARCHAR(255) NOT NULL,
                    record_data JSON NOT NULL,
                    PRIMARY KEY (record_key)
                )
            `);

            await connection.query(`
                CREATE TABLE IF NOT EXISTS signalbox_reminders (
                    record_key VARCHAR(255) NOT NULL,
                    record_data JSON NOT NULL,
                    PRIMARY KEY (record_key)
                )
            `);

            await connection.query(`
                CREATE TABLE IF NOT EXISTS signalbox_invites (
                    record_key VARCHAR(255) NOT NULL,
                    record_data JSON NOT NULL,
                    PRIMARY KEY (record_key)
                )
            `);
        } finally {
            connection.release();
        }
    }

    async get<T>(
        collection: PersistenceCollection,
        key: string
    ): Promise<T | null> {
        const table = this.getTableName(collection);

        const [rows] = await this.pool.execute<PersistenceRow[]>(
            `
                    SELECT record_data
                    FROM ${table}
                    WHERE record_key = ?
                    LIMIT 1
                `,
            [key]
        );

        if (rows.length === 0) {
            return null;
        }

        return this.parseRecordData<T>(rows[0].record_data);
    }

    async getAll<T>(collection: PersistenceCollection): Promise<T[]> {
        const table = this.getTableName(collection);

        const [rows] = await this.pool.query<PersistenceRow[]>(
            `
                    SELECT record_data
                    FROM ${table}
                `
        );

        return rows.map((row) => this.parseRecordData<T>(row.record_data));
    }

    async getAllEntries<T>(
        collection: PersistenceCollection
    ): Promise<Array<[string, T]>> {
        const table = this.getTableName(collection);

        const [rows] = await this.pool.query<PersistenceRow[]>(
            `
                    SELECT record_key, record_data
                    FROM ${table}
                `
        );

        return rows.map((row) => [
            row.record_key,
            this.parseRecordData<T>(row.record_data),
        ]);
    }

    async set<T>(
        collection: PersistenceCollection,
        key: string,
        value: T
    ): Promise<void> {
        const table = this.getTableName(collection);

        const serialized = JSON.stringify(value);

        await this.pool.execute<ResultSetHeader>(
            `
                INSERT INTO ${table} (
                    record_key,
                    record_data
                )
                VALUES (?, ?)
                ON DUPLICATE KEY UPDATE
                    record_data = VALUES(record_data)
            `,
            [key, serialized]
        );
    }

    async delete(
        collection: PersistenceCollection,
        key: string
    ): Promise<boolean> {
        const table = this.getTableName(collection);

        const [result] = await this.pool.execute<ResultSetHeader>(
            `
                    DELETE FROM ${table}
                    WHERE record_key = ?
                `,
            [key]
        );

        return result.affectedRows > 0;
    }

    async close(): Promise<void> {
        await this.pool.end();
    }

    private parseRecordData<T>(data: unknown): T {
        // mysql2 auto-parses JSON-typed columns into objects, so `data` may
        // already be the deserialized value rather than a raw string.
        return (typeof data === 'string' ? JSON.parse(data) : data) as T;
    }

    private getTableName(collection: PersistenceCollection): string {
        switch (collection) {
            case 'applications':
                return 'signalbox_applications';

            case 'strikes':
                return 'signalbox_strikes';

            case 'reminders':
                return 'signalbox_reminders';

            case 'invites':
                return 'signalbox_invites';

            default: {
                const exhaustiveCheck: never = collection;

                throw new Error(
                    `Unsupported persistence collection: ${exhaustiveCheck}`
                );
            }
        }
    }
}
