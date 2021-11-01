import { SyncStore, ISyncStore } from './sync-store';
import { VersionedSyncStore } from './ver-sync-store';

type GConstructor<T = {}> = new (...args: any[]) => T;
type Lookupable<T> = GConstructor<ISyncStore<Record<string, T>>>;

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function LookupMixin<T, TBase extends Lookupable<T>>(Base: TBase) {
  return class LookupMixin extends Base {
    async getItem(key: string): Promise<T> {
      const storeValue = await this.get();
      return storeValue[key];
    }

    async setItem(key: string, value: T): Promise<void> {
      const storeValue = await this.get();
      storeValue[key] = value;
      await this.set(storeValue);
    }
  };
}

export class LookupStore<T> extends LookupMixin(SyncStore)<T> { }
export class VersionedLookupStore<T> extends LookupMixin(VersionedSyncStore)<T> { }
