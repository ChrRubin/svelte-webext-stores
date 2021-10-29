// import { SyncStore } from '../sync-store';
import { StorageLegacy } from '../storage-backend';
import { WebExtStores } from '../web-ext-stores';
import { Unsubscriber } from 'svelte/store';

describe('SyncStore', () => {
  const backend = new StorageLegacy('session');
  const stores = new WebExtStores(backend);
  const SyncStore = stores.newSyncStore.bind(stores);

  const key = 'hey';
  const value1 = 'listen';
  const value2 = 'watch out';
  const value3 = 'take this';

  afterEach(async () => await stores._clear());

  test('Default value', async () => {
    const store = SyncStore(key, value1);
    expect(await store.get()).toBe(value1);
  });

  test('Get and set', async () => {
    const store = SyncStore(key, value1);
    await store.set(value2);
    expect(await store.get()).toBe(value2);
  });

  test('Saves to storage', async () => {
    const store = SyncStore(key, value1);
    // expect(await backend.get(key)).toBe(value1);
    await store.set(value2);
    expect(await backend.get(key)).toBe(value2);
  });

  test('Loads from storage', async () => {
    await backend.set(key, value2);
    const store = SyncStore(key, value1);
    expect(await store.get()).toBe(value2);
  });

  test('Syncs with storage changes', async () => {
    const store = SyncStore(key, value1);
    await backend.set(key, value2);
    expect(await store.get()).toBe(value2);
  });

  test('Reset', async () => {
    const store = SyncStore(key, value1);
    await store.set(value3);
    expect(await store.get()).toBe(value3);
    expect(await backend.get(key)).toBe(value3);
    await store.reset();
    expect(await store.get()).toBe(value1);
    expect(await backend.get(key)).toBe(value1);
  });

  test('Subscribe', (done) => {
    let unSub: Unsubscriber | null = null;
    function callback(v: string): void {
      if (v === value1) return;
      let er: unknown;
      try {
        expect(v).toBe(value2);
      } catch (e) {
        er = e;
      } finally {
        if (unSub !== null) unSub();
        done(er);
      }
    }
    const store = SyncStore(key, value1);
    unSub = store.subscribe(callback);
    store.set(value2).catch((e) => console.error(e));
  });
});
