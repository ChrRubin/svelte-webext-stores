import { SyncStore, ISyncStore } from './sync-store';
import { VersionedSyncStore } from './ver-sync-store';

type GConstructor<T = {}> = new (...args: any[]) => T;
type Lookupable<T> = GConstructor<ISyncStore<Record<string, T>>>;

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function LookupMixin<T, TBase extends Lookupable<T>>(Base: TBase) {
  return class LookupMixin extends Base {
    /**
     * Get object property value.
     * @param key Property key.
     */
    async getItem(key: string): Promise<T> {
      const storeValue = await this.get();
      return storeValue[key];
    }

    /**
     * Set object property value.
     * @param key Property key.
     * @param value New property value.
     */
    async setItem(key: string, value: T): Promise<void> {
      const storeValue = await this.get();
      storeValue[key] = value;
      await this.set(storeValue);
    }
  };
}

/**
 * SyncStore for `Record<string, T>` objects. Provides convenience functions
 * for getting and setting property values using property keys.
 */
export class LookupStore<T> extends LookupMixin(SyncStore)<T> { }
/**
 * VersionedSyncStore for `Record<string, T>` objects. Provides convenience functions
 * for getting and setting property values using property keys.
 */
export class VersionedLookupStore<T> extends LookupMixin(VersionedSyncStore)<T> { }
