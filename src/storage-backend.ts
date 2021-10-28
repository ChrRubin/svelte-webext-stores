import type * as browser from 'webextension-polyfill';

type StorageArea = 'local' | 'sync' | 'managed';
type WebExtType = 'webExt' | 'chrome';
type Resolve<T> = (value: T) => void;
type Reject = (reason?: any) => void;
interface Changes { [key: string]: chrome.storage.StorageChange }
type OnChangedListener = (changes: Changes, areaName: StorageArea) => void;
type OnChangedCallback = (changes: Changes) => void;

/**
 * Interface contract for StorageBackend objects.
 */
export interface StorageBackend {
  /**
   * Get value from storage backend.
   * @param key Storage key.
   */
  get: <T>(key: string) => Promise<T | null>;
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
    const listener = (changes: Changes, areaName: string): void => {
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

  return { get, set, addOnChangedListener, cleanUp };
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

  return { get, set, addOnChangedListener, cleanUp };
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
 * Factory function for legacy/non-WebExtension storage backend.
 * @returns StorageBackend object.
 */
export function storageLegacy(): StorageBackend {
  let callbacks: OnChangedCallback[] = [];
  const listeners: Array<(event: StorageEvent) => void> = [];

  async function get<T>(key: string): Promise<T | null> {
    const result = localStorage.getItem(key);
    if (result == null) return result;
    return JSON.parse(result);
  }

  async function set<T>(key: string, value: T): Promise<void> {
    const oldValue = await get(key);
    localStorage.setItem(key, JSON.stringify(value));
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

  return { get, set, addOnChangedListener, cleanUp };
}
