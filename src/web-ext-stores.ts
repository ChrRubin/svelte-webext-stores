import { IStorageBackend, storageMV2 } from './storage';
import { ISyncStore, SyncStore, syncStore, VersionedOptions } from './stores';

/**
 * Handler for registering stores that are synced to storage.
 * This handler will listen to storage changes and automatically update
 * registered stores if needed.
 */
export class WebExtStores {
  private readonly _backend;
  private readonly _stores: Map<string, ISyncStore<any>>;

  /** @param backend Storage backend to use. Default: `StorageMV2()`. */
  constructor(backend: IStorageBackend = storageMV2()) {
    this._backend = backend;
    this._stores = new Map();

    backend.addOnChangedListener((changes) => {
      Object.keys(changes).forEach((key) => {
        const change = changes[key];
        const result = this._stores.get(key);
        if (
          result == null ||
          !result.syncFromExternal ||
          change.oldValue !== result.getCurrent()
        ) return;
        result.set(change.newValue).catch((e) => console.error(e));
      });
    });
  }

  /**
   * Registers and returns a new SyncStore.
   * @param key Storage key.
   * @param defaultValue Store's default value.
   * @param syncFromExternal Whether store should be updated when storage
   * value is updated externally. Default: `true`.
   * @param versionedOptions Enables options for migrating storage values from
   * an older version to a mewer version.
   */
  newSyncStore<T>(
    key: string,
    defaultValue: T,
    syncFromExternal = true,
    versionedOptions?: VersionedOptions
  ): SyncStore<T> {
    const store =
      syncStore(
        key, defaultValue, this._backend, syncFromExternal, versionedOptions
      );
    this._stores.set(key, store);
    return store;
  }

  /**
   * Registers a custom store that implements ISyncStore.
   * @param getStore Callback that provides the handler's StorageBackend and
   * expects an ISyncStore implementation.
   */
  addCustomStore(
    getStore: (backend: IStorageBackend) => ISyncStore<any>
  ): void {
    const store = getStore(this._backend);
    this._stores.set(store.key, store);
  }

  /**
   * Removes and unregisters all registered stores from backend storage.
   * For tests purposes only.
   */
  async _clear(): Promise<void> {
    for (const key of this._stores.keys()) {
      await this._backend.remove(key);
    }
    this._stores.clear();
  }
}
