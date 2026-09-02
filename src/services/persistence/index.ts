import { JsonPersistenceProvider } from './jsonPersistence';

import { MySqlPersistenceProvider } from './mysqlPersistence';

import { PersistenceCollection, PersistenceProvider } from './types';

let provider: PersistenceProvider | null = null;

/**
 * Create the persistence provider selected by the environment.
 *
 * Supported providers:
 *   - json  (default)
 *   - mysql
 */
function createProvider(): PersistenceProvider {
    const persistenceProvider = (
        process.env.PERSISTENCE_PROVIDER ?? 'json'
    ).toLowerCase();

    switch (persistenceProvider) {
        case 'json':
            console.log('[Persistence] Using JSON file persistence.');

            return new JsonPersistenceProvider();

        case 'mysql': {
            const host = process.env.MYSQL_HOST;

            const port = Number(process.env.MYSQL_PORT ?? 3306);

            const database = process.env.MYSQL_DATABASE;

            const user = process.env.MYSQL_USER;

            const password = process.env.MYSQL_PASSWORD;

            if (!host) {
                throw new Error(
                    '[Persistence] MYSQL_HOST is required when using MySQL.'
                );
            }

            if (!database) {
                throw new Error(
                    '[Persistence] MYSQL_DATABASE is required when using MySQL.'
                );
            }

            if (!user) {
                throw new Error(
                    '[Persistence] MYSQL_USER is required when using MySQL.'
                );
            }

            if (!Number.isInteger(port) || port <= 0) {
                throw new Error(
                    '[Persistence] MYSQL_PORT must be a valid positive integer.'
                );
            }

            console.log(
                `[Persistence] Using MySQL persistence at ${host}:${port}/${database}.`
            );

            return new MySqlPersistenceProvider({
                host,
                port,
                database,
                user,
                password: password ?? '',
            });
        }

        default:
            throw new Error(
                `[Persistence] Unsupported provider "${persistenceProvider}". ` +
                    'Expected "json" or "mysql".'
            );
    }
}

/**
 * Initialize the configured persistence provider.
 */
export async function initializePersistence(): Promise<PersistenceProvider> {
    if (provider) {
        return provider;
    }

    provider = createProvider();

    try {
        await provider.initialize();
    } catch (error) {
        console.error(
            '[Persistence] Failed to initialize persistence provider:',
            error
        );

        provider = null;

        throw error;
    }

    return provider;
}

/**
 * Return the initialized persistence provider.
 *
 * Throws if initializePersistence() has not been called yet.
 */
export function getPersistence(): PersistenceProvider {
    if (!provider) {
        throw new Error(
            '[Persistence] Persistence has not been initialized. ' +
                'Call initializePersistence() before using getPersistence().'
        );
    }

    return provider;
}

/**
 * Shut down the persistence provider.
 */
export async function closePersistence(): Promise<void> {
    if (!provider) {
        return;
    }

    try {
        await provider.close();
    } finally {
        provider = null;
    }
}

export { PersistenceCollection } from './types';

export type { PersistenceProvider } from './types';
