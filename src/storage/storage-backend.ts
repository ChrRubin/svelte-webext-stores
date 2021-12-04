interface StorageChange {
  newValue?: any;
  oldValue?: any;
}

export type StorageChanges = Record<string, StorageChange>;
export type OnChangedCallback = (changes: StorageChanges) => void;

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
