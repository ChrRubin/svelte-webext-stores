export {
  IStorageBackend,
  StorageMV2,
  StorageMV3,
  StorageWebExt,
  StorageLegacy
} from './storage/storage-backend';

export { ISyncStore, SyncStore } from './stores/sync-store';
export { WebExtStores } from './web-ext-stores';
export { VersionedSyncStore, MigrationStrategy } from './stores/ver-sync-store';
export { LookupStore, VersionedLookupStore } from './stores/lookup-store';
