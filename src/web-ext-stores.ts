import { IStorageBackend, storageMV2 } from './storage';
import { ISyncStore, SyncStore, syncStore, VersionedOptions } from './stores';

/**
 * Handler for registering stores that are synced to storage.
 * This handler will listen to storage changes and automatically update
 * registered stores if needed.
 */
export interface WebExtStores {
  /**
   * Registers and returns a new SyncStore.
   * @param key Storage key.
   * @param defaultValue Store's default value.
   * @param syncFromExternal Whether store should be updated when storage
   * value is updated externally. Default: `true`.
   * @param versionedOptions Enables options for migrating storage values from
   * an older version to a mewer version.
   */
  addSyncStore: <T>(
    key: string,
    defaultValue: T,
    syncFromExternal?: boolean,
    versionedOptions?: VersionedOptions
  ) => SyncStore<T>;
  /**
   * Registers a custom store that implements ISyncStore.
   * @param getStore Callback that provides the handler's StorageBackend and
   * expects an ISyncStore implementation.
   */
  addCustomStore: (
    getStore: (backend: IStorageBackend) => ISyncStore<any>
  ) => void;
  /**
   * Removes and unregisters all registered stores from backend storage.
   * For tests purposes only.
   */
  _clear: () => Promise<void>;
}

/**
 * Create handler for registering stores that are synced to storage.
 * @param backend Storage backend.
 */
export function webExtStores(backend: IStorageBackend = storageMV2()): WebExtStores {
  const stores: Map<string, ISyncStore<any>> = new Map();

  backend.addOnChangedListener((changes) => {
    Object.keys(changes).forEach((key) => {
      const change = changes[key];
      const result = stores.get(key);
      if (
        result == null ||
        !result.syncFromExternal ||
        change.oldValue !== result.getCurrent()
      ) return;
      result.set(change.newValue).catch((e) => console.error(e));
    });
  });

  function addSyncStore<T>(
    key: string,
    defaultValue: T,
    syncFromExternal = true,
    versionedOptions?: VersionedOptions
  ): SyncStore<T> {
    const store =
      syncStore(
        key, defaultValue, backend, syncFromExternal, versionedOptions
      );
    stores.set(key, store);
    return store;
  }

  function addCustomStore(
    getStore: (backend: IStorageBackend) => ISyncStore<any>
  ): void {
    const store = getStore(backend);
    stores.set(store.key, store);
  }

  async function _clear(): Promise<void> {
    for (const key of stores.keys()) {
      await backend.remove(key);
    }
    stores.clear();
  }

  return { addSyncStore, addCustomStore, _clear };
}
