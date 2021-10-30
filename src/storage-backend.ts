import type * as browser from 'webextension-polyfill';

export type WebExtStorageArea = 'local' | 'sync' | 'managed';
export type WebStorageType = 'session' | 'local';
export type StorageChanges = Record<string, chrome.storage.StorageChange>;
export type OnChangedCallback = (changes: StorageChanges) => void;

type OnChangedListener = (changes: StorageChanges, areaName: WebExtStorageArea) => void;

/** Interface contract for storage backends. */
export interface IStorageBackend {
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
  /** Perform clean up operations. */
  cleanUp: () => void;
  /** Remove item with given key from storage. */
  remove: (key: string) => Promise<void>;
  /** Clears all stored values from storage backend. */
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

function initWebExtStorage(type: 'webExt', area: WebExtStorageArea): WebExtStorage;
function initWebExtStorage(type: 'chrome', area: WebExtStorageArea): ChromeStorage;
function initWebExtStorage(type: 'webExt' | 'chrome', area: WebExtStorageArea): WebExtStorage | ChromeStorage {
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

/** StorageBackend for Chrome Manifest Version 2 (callback API). */
export class StorageMV2 implements IStorageBackend {
  private readonly _storageArea;
  readonly addOnChangedListener;
  readonly cleanUp;

  /**
   * @param area Type of StorageArea to use.
   * Valid values: `'local'` | `'sync'` | `'managed'`
   * Default: `'local'`
   */
  constructor(area: WebExtStorageArea = 'local') {
    const {
      storageArea, addOnChangedListener, cleanUp
    } = initWebExtStorage('chrome', area);
    this._storageArea = storageArea;
    this.addOnChangedListener = addOnChangedListener;
    this.cleanUp = cleanUp;
  }

  _resolveCallback<T>(
    value: T, resolve: (value: T) => void, reject: (reason?: any) => void
  ): void {
    const error = chrome.runtime.lastError;
    if (error != null) {
      reject(error);
      return;
    }
    resolve(value);
  }

  async get<T>(key: string): Promise<T> {
    return await new Promise(
      (resolve, reject) => this._storageArea.get(
        key,
        (result) => this._resolveCallback(result[key], resolve, reject)
      )
    );
  }

  async set<T>(key: string, value: T): Promise<void> {
    return await new Promise(
      (resolve, reject) => this._storageArea.set(
        { [key]: value },
        () => this._resolveCallback(undefined, resolve, reject)
      )
    );
  }

  async remove(key: string): Promise<void> {
    return await new Promise(
      (resolve, reject) => this._storageArea.remove(
        key,
        () => this._resolveCallback(undefined, resolve, reject)
      )
    );
  }

  async clear(): Promise<void> {
    return await new Promise(
      (resolve, reject) => this._storageArea.clear(
        () => this._resolveCallback(undefined, resolve, reject)
      )
    );
  }
}

class storageWebExtShared implements IStorageBackend {
  private readonly _storageArea;
  readonly addOnChangedListener;
  readonly cleanUp;

  constructor(type: 'webExt' | 'chrome', area: WebExtStorageArea) {
    const {
      storageArea, addOnChangedListener, cleanUp
    } = type === 'webExt'
      ? initWebExtStorage('webExt', area)
      : initWebExtStorage('chrome', area);
    this._storageArea = storageArea;
    this.addOnChangedListener = addOnChangedListener;
    this.cleanUp = cleanUp;
  }

  async get<T>(key: string): Promise<T> {
    return await this._storageArea.get(key).then((result) => result[key]);
  }

  async set<T>(key: string, value: T): Promise<void> {
    return await this._storageArea.set({ [key]: value });
  }

  async remove(key: string): Promise<void> {
    return await this._storageArea.remove(key);
  }

  async clear(): Promise<void> {
    return await this._storageArea.clear();
  }
}

/** StorageBackend for Chrome Manifest Version 3 (Promise API). */
export class StorageMV3 extends storageWebExtShared {
  /**
   * @param area Type of StorageArea to use.
   * Valid values: `'local'` | `'sync'` | `'managed'`
   * Default: `'local'`
   */
  constructor(area: WebExtStorageArea = 'local') {
    super('chrome', area);
  }
}

/** StorageBackend for Mozilla WebExtension (browser API). */
export class StorageWebExt extends storageWebExtShared {
  /**
   * @param area Type of StorageArea to use.
   * Valid values: `'local'` | `'sync'` | `'managed'`
   * Default: `'local'`
   */
  constructor(area: WebExtStorageArea = 'local') {
    super('webExt', area);
  }
}

/**
 * StorageBackend for legacy/non-WebExtension
 * (`localStorage` or `sessionStorage`).
 */
export class StorageLegacy implements IStorageBackend {
  private readonly _storage;
  private _callbacks: OnChangedCallback[];
  private readonly _listeners: Array<(event: StorageEvent) => void>;

  /**
   * @param area Type of StorageArea to use.
   * Valid values: `'local'` | `'session'`
   * Default: `'local'`
   */
  constructor(area: WebStorageType) {
    this._storage = area === 'local' ? localStorage : sessionStorage;
    this._callbacks = [];
    this._listeners = [];
  }

  async get<T>(key: string): Promise<T | undefined> {
    const result = this._storage.getItem(key);
    if (result == null) return undefined;
    return JSON.parse(result);
  }

  async set<T>(key: string, value: T): Promise<void> {
    const oldValue = await this.get(key);
    this._storage.setItem(key, JSON.stringify(value));
    this._callbacks.forEach((callback) => {
      const changes = {
        [key]: { oldValue, newValue: value }
      };
      callback(changes);
    });
  }

  addOnChangedListener(callback: OnChangedCallback): void {
    const listener = (event: StorageEvent): void => {
      if (event.key == null) return;
      const changes = {
        [event.key]: { oldValue: event.oldValue, newValue: event.newValue }
      };
      callback(changes);
    };
    window.addEventListener('storage', listener);
    this._callbacks.push(callback);
    this._listeners.push(listener);
  }

  cleanUp(): void {
    this._callbacks = [];
    this._listeners.forEach((l) => window.removeEventListener('storage', l));
  }

  async remove(key: string): Promise<void> {
    this._storage.removeItem(key);
  }

  async clear(): Promise<void> {
    this._storage.clear();
  }
}
