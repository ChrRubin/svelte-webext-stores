import type * as browser from 'webextension-polyfill';
import { IStorageBackend, StorageChanges, OnChangedCallback } from './storage-backend';

export type WebExtStorageArea = 'local' | 'sync' | 'managed';
type OnChangedListener = (changes: StorageChanges, areaName: WebExtStorageArea) => void;

interface WebExtStorage {
  storageArea: browser.Storage.StorageArea;
  addOnChangedListener: (callback: OnChangedCallback) => void;
  cleanUp: () => void;
}

interface ChromeStorage extends Omit<WebExtStorage, 'storageArea'> {
  storageArea: chrome.storage.StorageArea;
}

export function initWebExtStorage(type: 'webExt', area: WebExtStorageArea): WebExtStorage;
export function initWebExtStorage(type: 'chrome', area: WebExtStorageArea): ChromeStorage;
export function initWebExtStorage(type: 'webExt' | 'chrome', area: WebExtStorageArea): WebExtStorage | ChromeStorage {
  const listeners: OnChangedListener[] = [];
  // @ts-expect-error Ignore browser namespace error
  const storage = type === 'webExt' ? browser.storage : chrome.storage;
  const storageArea = storage[area];

  function addOnChangedListener(callback: OnChangedCallback): void {
    const listener = (changes: StorageChanges, areaName: string): void => {
      if (areaName !== area) return;
      callback(changes);
    };
    storage.onChanged.addListener(listener);
    listeners.push(listener);
  }

  function cleanUp(): void {
    listeners.forEach((l) => chrome.storage.onChanged.removeListener(l));
  }

  return { storageArea, addOnChangedListener, cleanUp };
}

export function storageWebExtShared(type: 'webExt' | 'chrome', area: WebExtStorageArea): IStorageBackend {
  const {
    storageArea, addOnChangedListener, cleanUp
  } = type === 'webExt'
    ? initWebExtStorage('webExt', area)
    : initWebExtStorage('chrome', area);

  async function get<T>(key: string): Promise<T> {
    return await storageArea.get(key).then((result) => result[key]);
  }

  async function set<T>(key: string, value: T): Promise<void> {
    return await storageArea.set({ [key]: value });
  }

  async function remove(key: string): Promise<void> {
    return await storageArea.remove(key);
  }

  async function clear(): Promise<void> {
    return await storageArea.clear();
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

/** Storage backend for Mozilla WebExtension (browser API). */
export interface StorageWebExt extends IStorageBackend { }

/**
 * Create storage backend for Mozilla WebExtension (browser API).
 * @param area `'local'` | `'sync'` | `'managed'`. Default: `'local'`
 */
export function storageWebExt(area: WebExtStorageArea = 'local'): StorageWebExt {
  return storageWebExtShared('webExt', area);
}
