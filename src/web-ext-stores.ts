import { StorageBackend, StorageMV2 } from './storage-backend';
import { ISyncStore, SyncStore } from './sync-store';
import { VersionedSyncStore, MigrationStrategy } from './ver-sync-store';

/**
 * Handler for registering stores that are synced to storage.
 * This handler will listen to storage changes and automatically update
 * registered stores if needed.
 */
export class WebExtStores {
  private readonly _backend;
  private readonly _stores: Map<string, ISyncStore<any>>;

  /**
   * @param backend Storage backend to use. Default: `new StorageMV2()`.
   */
  constructor(backend: StorageBackend = new StorageMV2()) {
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
   * @returns SyncStore
   */
  newSyncStore<T>(
    key: string, defaultValue: T, syncFromExternal = true
  ): SyncStore<T> {
    const store =
      new SyncStore(key, defaultValue, this._backend, syncFromExternal);
    this._stores.set(key, store);
    return store;
  }

  /**
   * Registers and returns a new VersionedSyncStore.
   * @param key Storage key.
   * @param defaultValue Store default value.
   * @param syncFromExternal Whether store is updated when storage value is
   * updated outside of the current context. Default: `true`.
   * @param version Current version number. Default: `0`.
   * @param separator Separator between key and version. Default: `'$$'`.
   * @param migrations Map of MigrationFunctions. Default: Empty array.
   * @returns VersionedSyncStore object.
   */
  newVersionedSyncStore<T>(
    key: string,
    defaultValue: T,
    syncFromExternal = true,
    version = 0,
    separator = '$$',
    migrations: Array<MigrationStrategy<T>> = []
  ): VersionedSyncStore<T> {
    const store = new VersionedSyncStore(
      key,
      defaultValue,
      this._backend,
      syncFromExternal,
      version,
      separator,
      migrations
    );
    this._stores.set(store.key, store);
    return store;
  }

  /**
   * Registers a custom store that implements ISyncStore.
   * @param getStore Callback that provides the handler's StorageBackend and
   * expects an ISyncStore implementation.
   */
  addCustomStore(
    getStore: (backend: StorageBackend) => ISyncStore<any>
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
