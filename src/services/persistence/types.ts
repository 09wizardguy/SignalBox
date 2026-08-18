export const PersistenceCollection = {
    Applications: 'applications',
    Strikes: 'strikes',
    Reminders: 'reminders',
    Invites: 'invites',
} as const;

export type PersistenceCollection =
    (typeof PersistenceCollection)[keyof typeof PersistenceCollection];

export interface PersistenceProvider {
    /**
     * Initialize the persistence backend.
     */
    initialize(): Promise<void>;

    /**
     * Retrieve one persisted record by key.
     */
    get<T>(collection: PersistenceCollection, key: string): Promise<T | null>;

    /**
     * Retrieve every persisted value in a collection.
     */
    getAll<T>(collection: PersistenceCollection): Promise<T[]>;

    /**
     * Retrieve every persisted key/value pair in a collection.
     *
     * This is useful for collections where the key is part of the
     * application's data model, such as reminders and invite tracking.
     */
    getAllEntries<T>(
        collection: PersistenceCollection
    ): Promise<Array<[string, T]>>;

    /**
     * Insert or replace a persisted record.
     */
    set<T>(
        collection: PersistenceCollection,
        key: string,
        value: T
    ): Promise<void>;

    /**
     * Delete a persisted record.
     *
     * Returns true if a record was deleted.
     */
    delete(collection: PersistenceCollection, key: string): Promise<boolean>;

    /**
     * Close any resources owned by the provider.
     */
    close(): Promise<void>;
}
