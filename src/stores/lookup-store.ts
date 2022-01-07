import { ISyncStore } from './sync-store';

type RecordStore<T extends Record<string, any>> = ISyncStore<T>;

/**
 * SyncStore for `Record<string, any>` objects. Provides convenience functions
 * for getting and setting property values using property keys.
 */
export type LookupableStore<T extends Record<string, any>> = RecordStore<T> & {
  /** Get object property value. */
  getItem: <R extends T[keyof T]>(key: keyof T) => Promise<R>;
  /** Set object property value. */
  setItem: (key: keyof T, value: any) => Promise<void>;
};

export function addLookupMixin<T extends Record<string, any>>(
  store: RecordStore<T>
): LookupableStore<T> {
  async function getItem<R extends T[keyof T]>(key: keyof T): Promise<R> {
    const storeValue = await store.get();
    return storeValue[key];
  }

  async function setItem(key: keyof T, value: any): Promise<void> {
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
