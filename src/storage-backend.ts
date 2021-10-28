import type * as browser from 'webextension-polyfill';

export type StorageArea = 'local' | 'sync' | 'managed';
export type WebStorageType = 'session' | 'local';
export type StorageChanges = Record<string, chrome.storage.StorageChange>;
export type OnChangedCallback = (changes: StorageChanges) => void;

type WebExtType = 'webExt' | 'chrome';
type Resolve<T> = (value: T) => void;
type Reject = (reason?: any) => void;
type OnChangedListener = (changes: StorageChanges, areaName: StorageArea) => void;

/**
 * Interface contract for StorageBackend objects.
 */
export interface StorageBackend {
  /**
   * Get value from storage backend.
   * @param key Storage key.
   */
  get: <T>(key: string) => Promise<T | undefined>;
  /**
   * Set value in storage backend.
   * @param key Storage key.
   * @param value Value to set.
   */
  set: <T>(key: string, value: T) => Promise<void>;
  /**
   * Add listener for storage change events.
   * @param callback Callback function when onChanged event is triggered.
   */
  addOnChangedListener: (callback: OnChangedCallback) => void;
  /**
   * Perform clean up operations.
   */
  cleanUp: () => void;
  /**
   * Remove item with given key from storage.
   */
  remove: (key: string) => Promise<void>;
  /**
   * Clears all stored values from storage backend.
   */
  clear: () => Promise<void>;
}

interface WebExtStorage {
  storageArea: browser.Storage.StorageArea;
  addOnChangedListener: (callback: OnChangedCallback) => void;
  cleanUp: () => void;
}

interface ChromeStorage extends Omit<WebExtStorage, 'storageArea'> {
  storageArea: chrome.storage.StorageArea;
}

function initWebExtStorage(type: 'webExt', area: StorageArea): WebExtStorage;
function initWebExtStorage(type: 'chrome', area: StorageArea): ChromeStorage;
function initWebExtStorage(type: WebExtType, area: StorageArea): WebExtStorage | ChromeStorage {
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

function resolveCallback<T>(value: T, res: Resolve<T>, rej: Reject): void {
  const error = chrome.runtime.lastError;
  if (error != null) {
    rej(error);
    return;
  }
  res(value);
}

/**
 * Factory function for Manifest Version 2 (callback API) storage backend.
 *
 * @param area Type of StorageArea to use.
 * Valid values: `'local'` | `'sync'` | `'managed'`.
 * Default: `'local'`
 *
 * @returns StorageBackend object.
 */
export function storageMV2(area: StorageArea = 'local'): StorageBackend {
  const {
    storageArea, addOnChangedListener, cleanUp
  } = initWebExtStorage('chrome', area);

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

  return { get, set, addOnChangedListener, cleanUp, remove, clear };
}

function storageWebExtShared(type: WebExtType, area: StorageArea): StorageBackend {
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

  return { get, set, addOnChangedListener, cleanUp, remove, clear };
}

/**
 * Factory function for Manifest Version 3 (Promise API) storage backend.
 *
 * @param area Type of StorageArea to use.
 * Valid values: `'local'` | `'sync'` | `'managed'`.
 * Default: `'local'`
 *
 * @returns StorageBackend object.
 */
export function storageMV3(area: StorageArea = 'local'): StorageBackend {
  return storageWebExtShared('chrome', area);
}

/**
 * Factory function for Mozilla's WebExtension (browser API) storage backend.
 *
 * @param area Type of StorageArea to use.
 * Valid values: `'local'` | `'sync'` | `'managed'`.
 * Default: `'local'`
 *
 * @returns StorageBackend object.
 */
export function storageWebExt(area: StorageArea = 'local'): StorageBackend {
  return storageWebExtShared('webExt', area);
}

/**
 * Factory function for legacy/non-WebExtension storage backend
 * (`window.localStorage`, `window.sessionStorage`).
 * @param area Type of Web Storage to use.
 * Valid values: `'local'` | `'session'`
 * Default: `'local'`
 * @returns StorageBackend object.
 */
export function storageLegacy(area: WebStorageType = 'local'): StorageBackend {
  const storage = area === 'local' ? localStorage : sessionStorage;

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
    // storage window event only triggers for storage changes outside of current window
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

  return { get, set, addOnChangedListener, cleanUp, remove, clear };
}
