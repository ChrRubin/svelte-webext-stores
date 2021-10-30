import type { IStorageBackend } from './storage-backend';
import { SyncStore } from './sync-store';

/**
 * @template T Current/New value type
 */
export interface MigrationStrategy<T> {
  /**
   * Old version number to match.
   */
  oldVersion: number;
  /**
   * Function for migrating VersionedSyncStore storage values.
   * @param oldValue Old value.
   * @returns New value.
   */
  migrate: (oldValue: any) => T;
}

/**
 * SyncStore that also allows migrating storage values from an older version
 * to a newer version.
 */
export class VersionedSyncStore<T> extends SyncStore<T> {
  private readonly _keyPure;
  readonly version;
  readonly separator;
  readonly migrations;

  /**
   * @param key Item key.
   * @param defaultValue Item default value.
   * @param backend Storage backend to use.
   * @param syncFromExternal Whether store should be updated when storage
   * value is updated externally.
   * @param version Current version number.
   * @param separator Separator between key and version.
   * @param migrations Map of MigrationFunctions.
   */
  constructor(
    key: string,
    defaultValue: T,
    backend: IStorageBackend,
    syncFromExternal: boolean,
    version: number,
    separator: string,
    migrations: Array<MigrationStrategy<T>>
  ) {
    const currentKey = key.concat(separator, version.toString());
    super(currentKey, defaultValue, backend, syncFromExternal);
    this._keyPure = key;
    this.version = version;
    this.separator = separator;
    this.migrations = migrations;
  }

  async ready(): Promise<void> {
    if (this._isReady) return;
    await this.migrateBackend();
    await this._updateFromBackend();
    this._isReady = true;
  }

  async migrateBackend(): Promise<void> {
    for (const { oldVersion, migrate } of this.migrations) {
      const oldKey = this._keyPure.concat(
        this.separator, oldVersion.toString()
      );
      const oldValue = await this.backend.get(oldKey);
      if (oldValue === undefined) continue;
      const newValue = migrate(oldValue);
      await this.set(newValue);
      await this.backend.remove(oldKey);
    }
  }
}
