import { writable, Writable, Updater } from 'svelte/store';
import { storageMV2, StorageBackend } from './storage-backend';

/**
 * Svelte Writable store that is synchronized to the storage backend.
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
   * Whether store updates when storage value is updated outside of the
   * current context.
   */
  readonly syncAcrossSessions: boolean;
}

/**
 * Factory function for SyncStore objects.
 * @param key Storage key.
 * @param defaultValue Store default value.
 * @param backend StorageBackend object.
 * @param syncAcrossSessions Whether store updates when storage value is
 * updated outside of the current context
 * @returns SyncStore object.
 */
function syncStore<T>(
  key: string,
  defaultValue: T | null,
  backend: StorageBackend,
  syncAcrossSessions: boolean
): SyncStore<T | null> {
  let currentValue: T | null = defaultValue;
  const store = writable(defaultValue);

  function get(): T | null {
    return currentValue;
  }

  function setStore(value: T | null): void {
    store.set(value);
    currentValue = value;
  }

  async function set(value: T | null): Promise<void> {
    setStore(value);
    await backend.set(key, value);
  }

  async function update(updater: Updater<T | null>): Promise<void> {
    const result = updater(currentValue);
    await set(result);
  }

  async function updateFromBackend(): Promise<void> {
    const value = await backend.get<T>(key);
    setStore(value);
  }

  async function reset(): Promise<void> {
    await set(defaultValue);
  }

  updateFromBackend().catch((e) => console.error(e));

  return {
    get,
    set,
    update,
    subscribe: store.subscribe,
    updateFromBackend,
    reset,
    syncAcrossSessions
  };
}

export interface WebExtStorage {
  /**
   * Create new SyncStore.
   * @param key Storage key.
   * @param defaultValue Store default value.
   * @param syncAcrossSessions Whether store updates when storage value is
   * updated outside of the current context.
   */
  newSyncStore: <T>(
    key: string, defaultValue: T, syncAcrossSessions: boolean
  ) => SyncStore<T | null>;
  /**
   * Perform clean up operations.
   */
  cleanUp: () => void;
}

/**
 * Factory function for WebExtStorage objects.
 * @param backend StorageBackend to connect to.
 * @returns WebExtStorage object.
 */
export function webExtStorage(
  backend: StorageBackend = storageMV2()
): WebExtStorage {
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
  ): SyncStore<T | null> {
    const store = syncStore(key, defaultValue, backend, syncAcrossSessions);
    stores.set(key, store);
    return store;
  }

  return { newSyncStore, cleanUp: backend.cleanUp };
}
