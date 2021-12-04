import { IStorageBackend } from './storage-backend';
import { WebExtStorageArea, initWebExtStorage } from './web-extension';

/** Storage backend for Chrome Manifest Version 2 (callback API). */
export interface StorageMV2 extends IStorageBackend { }

/**
 * Create storage backend for Chrome Manifest Version 2 (callback API).
 * @param area `'local'` | `'sync'` | `'managed'`. Default: `'local'`
 */
export function storageMV2(area: WebExtStorageArea = 'local'): StorageMV2 {
  const {
    storageArea,
    addOnChangedListener,
    cleanUp
  } = initWebExtStorage('chrome', area);

  function resolveCallback<T>(
    value: T, resolve: (value: T) => void, reject: (reason?: any) => void
  ): void {
    const error = chrome.runtime.lastError;
    if (error != null) {
      reject(error);
      return;
    }
    resolve(value);
  }

  async function get<T>(key: string): Promise<T> {
    return await new Promise(
      (resolve, reject) => storageArea.get(
        key,
        (result) => resolveCallback(result[key], resolve, reject)
      )
    );
  }

  async function set<T>(key: string, value: T): Promise<void> {
    return await new Promise(
      (resolve, reject) => storageArea.set(
        { [key]: value },
        () => resolveCallback(undefined, resolve, reject)
      )
    );
  }

  async function remove(key: string): Promise<void> {
    return await new Promise(
      (resolve, reject) => storageArea.remove(
        key,
        () => resolveCallback(undefined, resolve, reject)
      )
    );
  }

  async function clear(): Promise<void> {
    return await new Promise(
      (resolve, reject) => storageArea.clear(
        () => resolveCallback(undefined, resolve, reject)
      )
    );
  }

  return {
    get,
    set,
    remove,
    clear,
    addOnChangedListener,
    cleanUp
  };
}
