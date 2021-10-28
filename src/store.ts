import type { Writable, Updater } from 'svelte/store';
import type { StorageBackend } from './storage-backend';
import { writable } from 'svelte/store';
import { storageMV2 } from './storage-backend';

/**
 * Writable store that is synchronized to the storage backend.
 */
export interface SyncStore<T> extends Writable<T> {
  /**
   * Get current store value.
   */
  get: () => T;
  /**
   * Update store value from storage backend.
   */
  updateFromBackend: () => Promise<void>;
  /**
   * Reset store value to default value.
   */
  reset: () => Promise<void>;
  set: (value: T) => Promise<void>;
  update: (updater: Updater<T>) => Promise<void>;
  /**
   * Whether store is updated when storage value is updated outside of the
   * current context.
   */
  readonly syncAcrossSessions: boolean;
  readonly key: string;
}

function syncStore<T>(
  key: string,
  defaultValue: T,
  backend: StorageBackend,
  syncAcrossSessions: boolean,
  skipInitialUpdate = false
): SyncStore<T> {
  let currentValue: T = defaultValue;
  const store = writable(defaultValue);

  function get(): T {
    return currentValue;
  }

  function setStore(value: T): void {
    store.set(value);
    currentValue = value;
  }

  async function set(value: T): Promise<void> {
    setStore(value);
    await backend.set(key, value);
  }

  async function update(updater: Updater<T>): Promise<void> {
    const result = updater(currentValue);
    await set(result);
  }

  async function updateFromBackend(): Promise<void> {
    const value = await backend.get<T>(key);
    if (value === undefined) {
      await backend.set(key, defaultValue);
      return;
    }
    setStore(value);
  }

  async function reset(): Promise<void> {
    await set(defaultValue);
  }

  // Initial storage backend check
  if (!skipInitialUpdate) updateFromBackend().catch((e) => console.error(e));

  return {
    get,
    set,
    update,
    subscribe: store.subscribe,
    updateFromBackend,
    reset,
    syncAcrossSessions,
    key
  };
}

/**
 * Writable store that is synchronized to the storage backend, and also allows
 * ease of migrating storage values from an older version to a newer version.
 */
interface VersionedSyncStore<T> extends SyncStore<T> { }

/**
 * @template T Current/New value type.
 */
export interface MigrationStrategy<T> {
  /**
   * Old version number to match.
   */
  oldVersion: number;
  /**
   * Function for migrating VersionedSyncStore storage values.
   * @template O Old value type.
   * @param oldValue Old value.
   * @returns New value.
   */
  migrationFunction: <O>(oldValue: O) => T;
}

function versionedSyncStore<T>(
  key: string,
  defaultValue: T,
  backend: StorageBackend,
  syncAcrossSessions: boolean,
  version: number,
  separator: string,
  migrations: Array<MigrationStrategy<T>>
): VersionedSyncStore<T> {
  const currentKey = key.concat(separator, version.toString());
  const ss = syncStore(currentKey, defaultValue, backend, syncAcrossSessions, true);

  migrations.forEach((strategy) => {
    (async () => {
      const oldKey = key.concat(separator, strategy.oldVersion.toString());
      const oldValue = await backend.get(oldKey);
      if (oldValue === undefined) return;
      const newValue = strategy.migrationFunction(oldValue);
      await ss.set(newValue);
      await backend.remove(oldKey);
    })().catch((e) => console.error(e));
  });

  return ss;
}

export interface WebExtStores {
  /**
   * Create new SyncStore.
   * @param key Storage key.
   * @param defaultValue Store default value.
   * @param syncAcrossSessions Whether store is updated when storage value is
   * updated outside of the current context. Default: `true`.
   * @returns SyncStore object.
   */
  newSyncStore: <T>(
    key: string, defaultValue: T, syncAcrossSessions?: boolean
  ) => SyncStore<T>;
  /**
   * Perform clean up operations.
   */
  cleanUp: () => void;
  /**
   * Create new VersionedSyncStore.
   * @param key Storage key.
   * @param defaultValue Store default value.
   * @param syncAcrossSessions Whether store is updated when storage value is
   * updated outside of the current context. Default: `true`.
   * @param version Current version number. Default: `0`.
   * @param separator Separator between key and version. Default: `'$$'`.
   * @param migrations Array of MigrationStrategy. Default: Empty array.
   * @returns VersionedSyncStore object.
   */
  newVersionedSyncStore: <T>(
    key: string,
    defaultValue: T,
    syncAcrossSessions?: boolean,
    version?: number,
    separator?: string,
    migrations?: Array<MigrationStrategy<T>>
  ) => VersionedSyncStore<T>;
}

/**
 * Factory function for WebExtStores objects.
 * @param backend StorageBackend to connect to. Default: `storageMV2()`.
 * @returns WebExtStores object.
 */
export function webExtStores(
  backend: StorageBackend = storageMV2()
): WebExtStores {
  const stores: Map<string, SyncStore<any>> = new Map();

  backend.addOnChangedListener((changes) => {
    Object.keys(changes).forEach((key) => {
      const result = stores.get(key);
      if (result == null || !result.syncAcrossSessions) return;
      result.updateFromBackend().catch((e) => console.error(e));
    });
  });

  function newSyncStore<T>(
    key: string, defaultValue: T, syncAcrossSessions = true
  ): SyncStore<T> {
    const store = syncStore(key, defaultValue, backend, syncAcrossSessions);
    stores.set(key, store);
    return store;
  }

  function newVersionedSyncStore<T>(
    key: string,
    defaultValue: T,
    syncAcrossSessions = true,
    version = 0,
    separator = '$$',
    migrations: Array<MigrationStrategy<T>> = []
  ): VersionedSyncStore<T> {
    const store = versionedSyncStore(key, defaultValue, backend, syncAcrossSessions, version, separator, migrations);
    stores.set(store.key, store);
    return store;
  }

  return { newSyncStore, cleanUp: backend.cleanUp, newVersionedSyncStore };
}
