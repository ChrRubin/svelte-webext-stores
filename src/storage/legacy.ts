import { IStorageBackend, OnChangedCallback } from './storage-backend';

export type WebStorageType = 'session' | 'local';

/**
 * Storage backend for legacy/non-WebExtension applications
 * (`localStorage` or `sessionStorage`).
 */
export interface StorageLegacy extends IStorageBackend { }

/**
 * Create storage backend for legacy/non-WebExtension applications.
 * @param area `'session'` | `'local'`. Default: `'session'`.
 */
export function storageLegacy(area: WebStorageType = 'session'): StorageLegacy {
  const storage = area === 'session' ? window.sessionStorage : window.localStorage;
  let callbacks: OnChangedCallback[] = [];
  const listeners: Array<(event: StorageEvent) => void> = [];

  async function get<T>(key: string): Promise<T | undefined> {
    const result = storage.getItem(key);
    if (result == null) return undefined;
    return JSON.parse(result);
  }

  async function set<T>(key: string, value: T): Promise<void> {
    const oldValue = await get(key);
    storage.setItem(key, JSON.stringify(value));
    callbacks.forEach((callback) => {
      const changes = {
        [key]: { oldValue, newValue: value }
      };
      callback(changes);
    });
  }

  function addOnChangedListener(callback: OnChangedCallback): void {
    const listener = (event: StorageEvent): void => {
      if (event.key == null) return;
      const changes = {
        [event.key]: { oldValue: event.oldValue, newValue: event.newValue }
      };
      callback(changes);
    };
    window.addEventListener('storage', listener);
    callbacks.push(callback);
    listeners.push(listener);
  }

  function cleanUp(): void {
    callbacks = [];
    listeners.forEach((l) => window.removeEventListener('storage', l));
  }

  async function remove(key: string): Promise<void> {
    storage.removeItem(key);
  }

  async function clear(): Promise<void> {
    storage.clear();
  }

  return {
    get,
    set,
    addOnChangedListener,
    cleanUp,
    remove,
    clear
  };
}
