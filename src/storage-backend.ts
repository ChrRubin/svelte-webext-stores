type StorageArea = 'local' | 'sync' | 'managed';
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

interface ChromeStorage {
  storageArea: chrome.storage.StorageArea;
  addOnChangedListener: (callback: OnChangedCallback) => void;
  cleanUp: () => void;
}

function initChromeStorage(area: StorageArea): ChromeStorage {
  const storageArea = chrome.storage[area];
  const listeners: OnChangedListener[] = [];

  function addOnChangedListener(callback: OnChangedCallback): void {
    const listener = (changes: Changes, areaName: StorageArea): void => {
      if (areaName !== area) return;
      callback(changes);
    };
    chrome.storage.onChanged.addListener(listener);
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
  const { storageArea, addOnChangedListener, cleanUp } = initChromeStorage(area);

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
  const { storageArea, addOnChangedListener, cleanUp } = initChromeStorage(area);

  async function get<T>(key: string): Promise<T> {
    return await storageArea.get(key).then((result) => result[key]);
  }

  async function set<T>(key: string, value: T): Promise<void> {
    return await storageArea.set({ [key]: value });
  }

  return { get, set, addOnChangedListener, cleanUp };
}

/**
 * Factory function for legacy/non-WebExtensions storage backend.
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
