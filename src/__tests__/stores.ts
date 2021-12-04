import { storageLegacy } from '../storage';
import { webExtStores } from '../web-ext-stores';
import { Unsubscriber } from 'svelte/store';
import { addLookupMixin } from '../stores';

const backend = storageLegacy('session');
const stores = webExtStores(backend);
const SyncStore = stores.addSyncStore;

afterEach(async () => await stores._clear());

describe('SyncStore', () => {
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

describe('SyncStore versioned', () => {
  const key = 'arch';
  const value1 = 64;
  const value2 = 86;
  const value3 = 'x64';
  const value4 = 'x86';
  const migration = (v: number): string => `x${v.toString()}`;

  test('Normal SyncStore functionality', async () => {
    const store = SyncStore(key, value1);
    expect(await store.get()).toBe(value1);
    expect(await backend.get(store.key)).toBe(value1);
    await store.set(value2);
    expect(await store.get()).toBe(value2);
    expect(await backend.get(store.key)).toBe(value2);
  });

  test('Migrate to new version', async () => {
    const store1 = SyncStore(
      key, value1, true, { version: 0, seperator: '$$' }
    );
    await store1.set(value2);

    const migrations = { 0: migration };
    const store2 = SyncStore(
      key, value3, true, { version: 1, seperator: '$$', migrations }
    );
    expect(await store2.get()).toBe(value4);
    expect(await backend.get(store2.key)).toBe(value4);
    expect(await backend.get(store1.key)).toBeUndefined();
  });

  test('Migrate from no version', async () => {
    const store1 = SyncStore(key, value1);
    await store1.set(value2);

    const migrations = { '-1': migration };
    const store2 = SyncStore(
      key, value3, true, { version: 1, seperator: '$$', migrations }
    );
    expect(await store2.get()).toBe(value4);
    expect(await backend.get(store2.key)).toBe(value4);
    expect(await backend.get(store1.key)).toBeUndefined();
  });
});

describe('SyncStore with LookupMixin', () => {
  const key = 'score';
  const value1: Record<string, number> = { a: 1, b: 2, c: 3 };
  const value2: Record<string, number> = { a: 3, b: 4, c: 5 };

  test('Normal SyncStore functionality', async () => {
    const store = SyncStore(key, value1);
    const LS = addLookupMixin<number, typeof store>(store);
    expect(await LS.get()).toStrictEqual(value1);
    expect(await backend.get(LS.key)).toStrictEqual(value1);
    await LS.set(value2);
    expect(await LS.get()).toStrictEqual(value2);
    expect(await backend.get(LS.key)).toStrictEqual(value2);
  });

  test('getItem()', async () => {
    const store = SyncStore(key, value1);
    const LS = addLookupMixin<number, typeof store>(store);
    expect(await LS.getItem('a')).toBe(1);
    expect(await LS.getItem('b')).toBe(2);
    expect(await LS.getItem('c')).toBe(3);
  });

  test('setItem()', async () => {
    const store = SyncStore(key, value1);
    const LS = addLookupMixin<number, typeof store>(store);
    await LS.setItem('b', 10);
    expect(await LS.getItem('b')).toBe(10);
    expect(await backend.get(LS.key)).toStrictEqual({ a: 1, b: 10, c: 3 });
  });
});
