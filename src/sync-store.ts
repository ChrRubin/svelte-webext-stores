import type { StorageBackend } from './storage-backend';
import { writable, Readable } from 'svelte/store';

/** Interface contract for stores that is synchronized to storage. */
export interface ISyncStore<T> extends Readable<T> {
  /** Update store value from storage backend. */
  updateFromBackend: () => Promise<void>;
  /**
   * Set value and inform subscribers.
   * @param value to set
   */
  set: (value: T) => Promise<void>;
  /** Get current value without updating from backend. */
  getCurrent: () => T;
  /**
   * Whether store should be updated when storage value is updated externally,
   * e.g. storage value is changed by another page.
   */
  readonly syncFromExternal: boolean;
  readonly key: string;
}

/** Store that is synchronized to the storage backend. */
export class SyncStore<T> implements ISyncStore<T> {
  readonly key;
  private readonly _defaultValue;
  private readonly _backend;
  readonly syncFromExternal;
  private _currentValue;
  private readonly _store;
  readonly subscribe;

  /**
   * @param key Item key.
   * @param defaultValue Item default value.
   * @param backend Storage backend to use.
   * @param syncAcrossSessions Whether store should be updated when storage
   * value is updated externally.
   */
  constructor(
    key: string,
    defaultValue: T,
    backend: StorageBackend,
    syncAcrossSessions: boolean
  ) {
    this.key = key;
    this._defaultValue = defaultValue;
    this._backend = backend;
    this.syncFromExternal = syncAcrossSessions;

    this._currentValue = defaultValue;
    this._store = writable(defaultValue);
    this.subscribe = this._store.subscribe;
  }

  private _setStore(value: T): void {
    this._store.set(value);
    this._currentValue = value;
  }

  /** Get current value after updating from backend. */
  async get(): Promise<T> {
    await this.updateFromBackend();
    return this._currentValue;
  }

  getCurrent(): T {
    return this._currentValue;
  }

  async set(value: T): Promise<void> {
    this._setStore(value);
    await this._backend.set(this.key, value);
  }

  async updateFromBackend(): Promise<void> {
    const value = await this._backend.get<T>(this.key);
    if (value === undefined) {
      await this._backend.set(this.key, this._defaultValue);
      return;
    }
    this._setStore(value);
  }

  /** Reset store value to default value. */
  async reset(): Promise<void> {
    await this.set(this._defaultValue);
  }
}
