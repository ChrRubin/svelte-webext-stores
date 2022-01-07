import type { IStorageBackend } from '../storage';
import { writable, Readable, Subscriber, Unsubscriber } from 'svelte/store';

/** Interface for stores that is synchronized to storage. */
export interface ISyncStore<T> extends Readable<T> {
  /** Get current value after updating from backend. */
  get: () => Promise<T>;
  /**
   * Set value, inform subscribers, and push to storage.
   * @param value to set
   */
  set: (value: T) => Promise<void>;
  /**
   * Get current value without updating from backend.
   *
   * Used for comparing storage changes when syncing from storage.
   */
  getCurrent: () => T;
  /**
   * Whether store should be updated when storage value is updated externally,
   * e.g. storage value is changed by another page.
   */
  readonly syncFromExternal: boolean;
  /** Storage item key. */
  readonly key: string;
}

export interface VersionedOptions<T> {
  /** Current version number. Do not use `-1`. */
  version: number;
  /** Separator between key and version. */
  seperator: string;
  /**
   * Map for migrating values.
   *
   * Keys are the old version to match against, and values are callbacks that
   * accepts the value found from the given old version and returns the
   * corresponding value for the current version.
   *
   * Use the key `-1` to migrate from a versionless store.
   */
  migrations?: Map<number, (oldValue: any) => T>;
}

/** Store that is synchronized to the storage backend. */
export interface SyncStore<T> extends ISyncStore<T> {
  /**
   * Ensure that any async initialization process (such as initial update
   * from backend) has been completed.
   *
   * You typically don't need to manually await unless you wish to sync
   * the store to the storage backend before any of `get()`, `set()` or
   * `subscribe()` is called.
   */
  ready: () => Promise<void>;
  /** Reset store value to default value. */
  reset: () => Promise<void>;
}

/**
 * Create a store that is synchronized to the storage backend.
 * @param key Storage key.
 * @param defaultValue Item default value.
 * @param backend Storage backend.
 * @param syncFromExternal Whether store should be updated when storage value
 * is updated externally.
 * @param versionedOptions Enables options for migrating storage values from an
 * older version to a newer version.
 */
export function syncStore<T>(
  key: string,
  defaultValue: T,
  backend: IStorageBackend,
  syncFromExternal: boolean,
  versionedOptions?: VersionedOptions<T>
): SyncStore<T> {
  let currentValue: T = defaultValue;
  let isReady = false;
  const store = writable(defaultValue);
  const keyPure = key;

  if (versionedOptions != null) {
    key = `${keyPure}${versionedOptions.seperator}${versionedOptions.version}`;
  }

  async function ready(): Promise<void> {
    if (isReady) return;
    await updateFromBackend();
    if (versionedOptions?.migrations != null) {
      for (const [oldVersion, migrate] of versionedOptions.migrations.entries()) {
        const oldKey = oldVersion === -1
          ? keyPure
          : `${keyPure}${versionedOptions.seperator}${oldVersion}`;
        const oldValue = await backend.get(oldKey);
        if (oldValue === undefined) continue;
        const newValue = migrate(oldValue);
        await set(newValue);
        await backend.remove(oldKey);
      }
    }
    isReady = true;
  }

  function setStore(value: T): void {
    store.set(value);
    currentValue = value;
  }

  async function get(): Promise<T> {
    await ready();
    return currentValue;
  }

  function getCurrent(): T {
    return currentValue;
  }

  async function set(value: T): Promise<void> {
    setStore(value);
    await backend.set(key, value);
  }

  async function updateFromBackend(): Promise<void> {
    const value = await backend.get<T>(key);
    if (value === undefined) {
      await backend.set(key, defaultValue);
      return;
    }
    setStore(value);
  }

  /** Reset store value to default value. */
  async function reset(): Promise<void> {
    await set(defaultValue);
  }

  function subscribe(run: Subscriber<T>): Unsubscriber {
    ready()
      .then(() => {
        if (typeof run !== 'function') console.log(run);
        run(currentValue);
      })
      .catch((e) => console.error(e));
    return store.subscribe(run);
  }

  return {
    subscribe,
    get,
    set,
    getCurrent,
    reset,
    ready,
    syncFromExternal,
    key
  };
}
