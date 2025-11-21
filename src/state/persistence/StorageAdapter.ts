/**
 * Storage Adapter
 *
 * IndexedDB abstraction layer for persisting application data.
 * Handles database creation, CRUD operations, and migrations.
 */

// =============================================================================
// TYPES
// =============================================================================

export interface StorageConfig {
  /** Database name */
  dbName: string;
  /** Database version */
  version: number;
  /** Store definitions */
  stores: StoreDefinition[];
}

export interface StoreDefinition {
  /** Store name */
  name: string;
  /** Primary key path */
  keyPath: string;
  /** Whether to auto-increment */
  autoIncrement?: boolean;
  /** Index definitions */
  indexes?: IndexDefinition[];
}

export interface IndexDefinition {
  /** Index name */
  name: string;
  /** Key path for index */
  keyPath: string | string[];
  /** Index options */
  options?: IDBIndexParameters;
}

export interface StorageTransaction {
  /** Store name */
  store: string;
  /** Transaction mode */
  mode: IDBTransactionMode;
}

// =============================================================================
// DEFAULT CONFIG
// =============================================================================

const DEFAULT_CONFIG: StorageConfig = {
  dbName: 'NanoBananaPro',
  version: 1,
  stores: [
    {
      name: 'projects',
      keyPath: 'id',
      indexes: [
        { name: 'by_name', keyPath: 'name' },
        { name: 'by_updated', keyPath: 'updatedAt' },
      ],
    },
    {
      name: 'settings',
      keyPath: 'key',
    },
    {
      name: 'history',
      keyPath: 'id',
      autoIncrement: true,
      indexes: [
        { name: 'by_project', keyPath: 'projectId' },
        { name: 'by_timestamp', keyPath: 'timestamp' },
      ],
    },
  ],
};

// =============================================================================
// STORAGE ADAPTER CLASS
// =============================================================================

/**
 * IndexedDB storage adapter for persistent data
 */
export class StorageAdapter {
  private config: StorageConfig;
  private db: IDBDatabase | null = null;
  private isInitialized = false;

  constructor(config: Partial<StorageConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  /**
   * Initialize the database connection
   */
  async initialize(): Promise<void> {
    if (this.isInitialized && this.db) {
      return;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.config.dbName, this.config.version);

      request.onerror = () => {
        reject(new Error(`Failed to open database: ${request.error?.message}`));
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.isInitialized = true;

        if (import.meta.env.DEV) {
          console.log('[StorageAdapter] Database initialized');
        }

        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        this.setupStores(db);
      };
    });
  }

  /**
   * Close the database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.isInitialized = false;

      if (import.meta.env.DEV) {
        console.log('[StorageAdapter] Database closed');
      }
    }
  }

  /**
   * Check if database is initialized
   */
  get ready(): boolean {
    return this.isInitialized && this.db !== null;
  }

  // ---------------------------------------------------------------------------
  // Database Setup
  // ---------------------------------------------------------------------------

  /**
   * Set up object stores during upgrade
   */
  private setupStores(db: IDBDatabase): void {
    for (const storeDef of this.config.stores) {
      // Skip if store already exists
      if (db.objectStoreNames.contains(storeDef.name)) {
        continue;
      }

      const storeOptions: IDBObjectStoreParameters = {
        keyPath: storeDef.keyPath,
      };
      if (storeDef.autoIncrement !== undefined) {
        storeOptions.autoIncrement = storeDef.autoIncrement;
      }

      const store = db.createObjectStore(storeDef.name, storeOptions);

      // Create indexes
      if (storeDef.indexes) {
        for (const indexDef of storeDef.indexes) {
          store.createIndex(indexDef.name, indexDef.keyPath, indexDef.options);
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // CRUD Operations
  // ---------------------------------------------------------------------------

  /**
   * Get a single item by key
   */
  async get<T>(storeName: string, key: IDBValidKey): Promise<T | undefined> {
    const db = this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onerror = () => reject(new Error(`Failed to get item: ${request.error?.message}`));
      request.onsuccess = () => resolve(request.result as T | undefined);
    });
  }

  /**
   * Get all items from a store
   */
  async getAll<T>(storeName: string): Promise<T[]> {
    const db = this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onerror = () =>
        reject(new Error(`Failed to get all items: ${request.error?.message}`));
      request.onsuccess = () => resolve(request.result as T[]);
    });
  }

  /**
   * Get items by index
   */
  async getByIndex<T>(
    storeName: string,
    indexName: string,
    key: IDBValidKey,
  ): Promise<T | undefined> {
    const db = this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.get(key);

      request.onerror = () =>
        reject(new Error(`Failed to get by index: ${request.error?.message}`));
      request.onsuccess = () => resolve(request.result as T | undefined);
    });
  }

  /**
   * Get all items by index
   */
  async getAllByIndex<T>(storeName: string, indexName: string, key: IDBValidKey): Promise<T[]> {
    const db = this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(key);

      request.onerror = () =>
        reject(new Error(`Failed to get all by index: ${request.error?.message}`));
      request.onsuccess = () => resolve(request.result as T[]);
    });
  }

  /**
   * Put (insert or update) an item
   */
  async put<T>(storeName: string, value: T): Promise<IDBValidKey> {
    const db = this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(value);

      request.onerror = () => reject(new Error(`Failed to put item: ${request.error?.message}`));
      request.onsuccess = () => resolve(request.result);
    });
  }

  /**
   * Add a new item (fails if key exists)
   */
  async add<T>(storeName: string, value: T): Promise<IDBValidKey> {
    const db = this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.add(value);

      request.onerror = () => reject(new Error(`Failed to add item: ${request.error?.message}`));
      request.onsuccess = () => resolve(request.result);
    });
  }

  /**
   * Delete an item by key
   */
  async delete(storeName: string, key: IDBValidKey): Promise<void> {
    const db = this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onerror = () => reject(new Error(`Failed to delete item: ${request.error?.message}`));
      request.onsuccess = () => resolve();
    });
  }

  /**
   * Clear all items from a store
   */
  async clear(storeName: string): Promise<void> {
    const db = this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onerror = () => reject(new Error(`Failed to clear store: ${request.error?.message}`));
      request.onsuccess = () => resolve();
    });
  }

  /**
   * Count items in a store
   */
  async count(storeName: string): Promise<number> {
    const db = this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.count();

      request.onerror = () => reject(new Error(`Failed to count items: ${request.error?.message}`));
      request.onsuccess = () => resolve(request.result);
    });
  }

  // ---------------------------------------------------------------------------
  // Batch Operations
  // ---------------------------------------------------------------------------

  /**
   * Put multiple items in a single transaction
   */
  async putBatch<T>(storeName: string, values: T[]): Promise<void> {
    const db = this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);

      transaction.onerror = () =>
        reject(new Error(`Batch put failed: ${transaction.error?.message}`));
      transaction.oncomplete = () => resolve();

      for (const value of values) {
        store.put(value);
      }
    });
  }

  /**
   * Delete multiple items by keys
   */
  async deleteBatch(storeName: string, keys: IDBValidKey[]): Promise<void> {
    const db = this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);

      transaction.onerror = () =>
        reject(new Error(`Batch delete failed: ${transaction.error?.message}`));
      transaction.oncomplete = () => resolve();

      for (const key of keys) {
        store.delete(key);
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Cursor Operations
  // ---------------------------------------------------------------------------

  /**
   * Iterate over items with a cursor
   */
  async forEach<T>(
    storeName: string,
    callback: (item: T, cursor: IDBCursorWithValue) => void,
  ): Promise<void> {
    const db = this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.openCursor();

      request.onerror = () =>
        reject(new Error(`Cursor iteration failed: ${request.error?.message}`));

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          callback(cursor.value as T, cursor);
          cursor.continue();
        } else {
          resolve();
        }
      };
    });
  }

  /**
   * Find items matching a predicate
   */
  async find<T>(storeName: string, predicate: (item: T) => boolean): Promise<T[]> {
    const results: T[] = [];

    await this.forEach<T>(storeName, (item) => {
      if (predicate(item)) {
        results.push(item);
      }
    });

    return results;
  }

  // ---------------------------------------------------------------------------
  // Utilities
  // ---------------------------------------------------------------------------

  /**
   * Ensure database is initialized and return the database
   */
  private ensureInitialized(): IDBDatabase {
    if (!this.db) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.db;
  }

  /**
   * Delete the database entirely
   */
  async deleteDatabase(): Promise<void> {
    this.close();

    return new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(this.config.dbName);

      request.onerror = () =>
        reject(new Error(`Failed to delete database: ${request.error?.message}`));
      request.onsuccess = () => {
        if (import.meta.env.DEV) {
          console.log('[StorageAdapter] Database deleted');
        }
        resolve();
      };
    });
  }

  /**
   * Export all data from a store as JSON
   */
  async exportStore<T>(storeName: string): Promise<T[]> {
    return this.getAll<T>(storeName);
  }

  /**
   * Import data into a store
   */
  async importStore<T>(storeName: string, data: T[], clearFirst = true): Promise<void> {
    if (clearFirst) {
      await this.clear(storeName);
    }
    await this.putBatch(storeName, data);
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let storageInstance: StorageAdapter | null = null;

/**
 * Get the storage adapter instance
 */
export function getStorageAdapter(config?: Partial<StorageConfig>): StorageAdapter {
  if (!storageInstance) {
    storageInstance = new StorageAdapter(config);
  }
  return storageInstance;
}

/**
 * Initialize the storage adapter
 */
export async function initStorage(config?: Partial<StorageConfig>): Promise<StorageAdapter> {
  const adapter = getStorageAdapter(config);
  await adapter.initialize();
  return adapter;
}

/**
 * Close the storage adapter
 */
export function closeStorage(): void {
  storageInstance?.close();
  storageInstance = null;
}

export default StorageAdapter;
