import type { IStorageBackend } from '../storage/storage-backend';
import { writable, Readable, Subscriber, Unsubscriber } from 'svelte/store';

/** Interface contract for stores that is synchronized to storage. */
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

/** Store that is synchronized to the storage backend. */
export class SyncStore<T> implements ISyncStore<T> {
  readonly key;
  readonly defaultValue;
  readonly backend;
  readonly syncFromExternal;
  protected _currentValue;
  protected readonly _store;
  protected _isReady;

  /**
   * @param key Item key.
   * @param defaultValue Item default value.
   * @param backend Storage backend to use.
   * @param syncFromExternal Whether store should be updated when storage
   * value is updated externally.
   */
  constructor(
    key: string,
    defaultValue: T,
    backend: IStorageBackend,
    syncFromExternal: boolean
  ) {
    this.key = key;
    this.defaultValue = defaultValue;
    this.backend = backend;
    this.syncFromExternal = syncFromExternal;

    this._currentValue = defaultValue;
    this._store = writable(defaultValue);
    this._isReady = false;
  }

  /**
   * Ensure that any async initialization process (such as initial update
   * from backend) has been completed.
   *
   * You typically don't need to manually await this unless you wish to sync
   * the store to the storage backend before any of `get()`, `set()` or
   * `subscribe()` is called.
   */
  async ready(): Promise<void> {
    if (this._isReady) return;
    await this._updateFromBackend();
    this._isReady = true;
  }

  private _setStore(value: T): void {
    this._store.set(value);
    this._currentValue = value;
  }

  async get(): Promise<T> {
    await this.ready();
    return this._currentValue;
  }

  getCurrent(): T {
    return this._currentValue;
  }

  async set(value: T): Promise<void> {
    this._setStore(value);
    await this.backend.set(this.key, value);
  }

  /** Update store value from storage backend. */
  protected async _updateFromBackend(): Promise<void> {
    const value = await this.backend.get<T>(this.key);
    if (value === undefined) {
      await this.backend.set(this.key, this.defaultValue);
      return;
    }
    this._setStore(value);
  }

  /** Reset store value to default value. */
  async reset(): Promise<void> {
    await this.set(this.defaultValue);
  }

  subscribe(run: Subscriber<T>): Unsubscriber {
    this.ready()
      .then(() => {
        if (typeof run !== 'function') console.log(run);
        run(this._currentValue);
      })
      .catch((e) => console.error(e));
    return this._store.subscribe(run);
  }
}
