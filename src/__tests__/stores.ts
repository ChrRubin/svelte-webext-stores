import { StorageLegacy } from '../storage-backend';
import { WebExtStores } from '../web-ext-stores';
import { Unsubscriber } from 'svelte/store';
import type { MigrationStrategy } from '../ver-sync-store';

const backend = new StorageLegacy('session');
const stores = new WebExtStores(backend);
afterEach(async () => await stores._clear());

describe('SyncStore', () => {
  const SyncStore = stores.newSyncStore.bind(stores);

  const key = 'hey';
  const value1 = 'listen';
  const value2 = 'watch out';
  const value3 = 'take this';

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
    await store.ready();
    expect(await backend.get(key)).toBe(value1);
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
        if (unSub !== null && typeof unSub === 'function') unSub();
        if (er != null) done(er);
        else done();
      }
    }
    const store = SyncStore(key, value1);
    unSub = store.subscribe(callback);
    store.set(value2).catch((e) => console.error(e));
  });
});

describe('VersionedSyncStore', () => {
  const VSS = stores.newVersionedSyncStore.bind(stores);

  const key = 'arch';
  const value1 = 64;
  const value2 = 86;
  const value3 = 'x64';
  const value4 = 'x86';

  test('Normal SyncStore functionality', async () => {
    const store = VSS(key, value1);
    expect(await store.get()).toBe(value1);
    expect(await backend.get(store.key)).toBe(value1);
    await store.set(value2);
    expect(await store.get()).toBe(value2);
    expect(await backend.get(store.key)).toBe(value2);
  });

  test('Migrate', async () => {
    const store1 = VSS(key, value1, true, 0, '$$');
    await store1.set(value2);
    const strat: MigrationStrategy<string> = {
      0: (v: number) => `x${v.toString()}`
    };
    const store2 = VSS(key, value3, true, 1, '$$', strat);
    expect(await store2.get()).toBe(value4);
    expect(await backend.get(store2.key)).toBe(value4);
    expect(await backend.get(store1.key)).toBeUndefined();
  });
});

describe('LookupStore', () => {
  const LS = stores.newLookupStore.bind(stores);

  const key = 'score';
  const value1 = { a: 1, b: 2, c: 3 };
  const value2 = { a: 3, b: 4, c: 5 };

  test('Normal SyncStore functionality', async () => {
    const store = LS(key, value1);
    expect(await store.get()).toStrictEqual(value1);
    expect(await backend.get(store.key)).toStrictEqual(value1);
    await store.set(value2);
    expect(await store.get()).toStrictEqual(value2);
    expect(await backend.get(store.key)).toStrictEqual(value2);
  });

  test('getItem()', async () => {
    const store = LS(key, value1);
    expect(await store.getItem('a')).toBe(1);
    expect(await store.getItem('b')).toBe(2);
    expect(await store.getItem('c')).toBe(3);
  });

  test('setItem()', async () => {
    const store = LS(key, value1);
    await store.setItem('b', 10);
    expect(await store.getItem('b')).toBe(10);
    expect(await backend.get(store.key)).toStrictEqual({ a: 1, b: 10, c: 3 });
  });
});
