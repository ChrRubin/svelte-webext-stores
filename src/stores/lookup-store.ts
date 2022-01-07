import { ISyncStore, SyncStore } from './sync-store';

export type ILookupStore<
  T extends Record<string, any>, S extends ISyncStore<T>
> = S & {
  /** Get object property value. */
  getItem: <R extends T[keyof T]>(key: keyof T) => Promise<R>;
  /** Set object property value. */
  setItem: <V extends T[keyof T]>(key: keyof T, value: V) => Promise<void>;
};

/**
 * SyncStore for `Record<string, any>` objects. Provides convenience methods
 * for getting and setting property values using property keys.
 */
export type LookupStore<T extends Record<string, any>> =
  ILookupStore<T, SyncStore<T>>;

export function addLookupMethods<
  T extends Record<string, any>, S extends ISyncStore<T>
>(store: S): ILookupStore<T, S> {
  async function getItem<R extends T[keyof T]>(key: keyof T): Promise<R> {
    const storeValue = await store.get();
    return storeValue[key];
  }

  async function setItem<V extends T[keyof T]>(key: keyof T, value: V): Promise<void> {
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
