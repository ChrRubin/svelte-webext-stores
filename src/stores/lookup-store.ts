import { ISyncStore } from './sync-store';

type RecordStore<T> = ISyncStore<Record<string, T>>;

/**
 * SyncStore for `Record<string, T>` objects. Provides convenience functions
 * for getting and setting property values using property keys.
 */
export type LookupableStore<T, S extends RecordStore<T>> = S & {
  /** Get object property value. */
  getItem: (key: string) => Promise<T | undefined>;
  /** Set object property value. */
  setItem: (key: string, value: T) => Promise<void>;
};

export function addLookupMixin<T, S extends RecordStore<T>>(
  store: S
): LookupableStore<T, S> {
  async function getItem(key: string): Promise<T | undefined> {
    const storeValue = await store.get();
    return storeValue[key];
  }

  async function setItem(key: string, value: T): Promise<void> {
    const storeValue = await store.get();
    storeValue[key] = value;
    await store.set(storeValue);
  }

  return {
    ...store,
    getItem,
    setItem
  };
}
