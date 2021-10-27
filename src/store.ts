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
}

function syncStore<T>(key: string, defaultValue: T | null, backend: StorageBackend): SyncStore<T | null> {
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

  return {
    get,
    set,
    update,
    subscribe: store.subscribe,
    updateFromBackend,
    reset
  };
}

export interface WebExtStorage {
  newSyncStore: <T>(key: string, defaultValue: T) => SyncStore<T | null>;
  cleanUp: () => void;
}

export function webExtStorage(backend: StorageBackend = storageMV2()): WebExtStorage {
  const stores: Map<string, SyncStore<unknown>> = new Map();

  backend.addOnChangedListener((changes) => {
    Object.keys(changes).forEach((key) => {
      const result = stores.get(key);
      if (result == null) return;
      result.updateFromBackend().catch((e) => console.error(e));
    });
  });

  function newSyncStore<T>(key: string, defaultValue: T): SyncStore<T | null> {
    const store = syncStore(key, defaultValue, backend);
    stores.set(key, store);
    return store;
  }

  return { newSyncStore, cleanUp: backend.cleanUp };
}
