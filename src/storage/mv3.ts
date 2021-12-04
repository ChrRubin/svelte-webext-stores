import { IStorageBackend } from './storage-backend';
import { storageWebExtShared, WebExtStorageArea } from './web-extension';

/** Storage backend for Chrome Manifest Version 3 (Promise API). */
export interface StorageMV3 extends IStorageBackend { }

/**
 * Create storage backend for Chrome Manifest Version 3 (Promise API).
 * @param area `'local'` | `'sync'` | `'managed'`. Default: `'local'`
 */
export function storageMV3(area: WebExtStorageArea = 'local'): StorageMV3 {
  return storageWebExtShared('chrome', area);
}
