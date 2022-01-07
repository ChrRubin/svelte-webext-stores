import { storageLegacy } from '../storage';
import { webExtStores } from '../web-ext-stores';
import { Unsubscriber } from 'svelte/store';

const backend = storageLegacy('session');
const stores = webExtStores(backend);
const SyncStore = stores.addSyncStore;
const LookupStore = stores.addLookupStore;

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

    const migrations = (new Map()).set(0, migration);
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

    const migrations = (new Map()).set(-1, migration);
    const store2 = SyncStore(
      key, value3, true, { version: 1, seperator: '$$', migrations }
    );
    expect(await store2.get()).toBe(value4);
    expect(await backend.get(store2.key)).toBe(value4);
    expect(await backend.get(store1.key)).toBeUndefined();
  });
});

describe('LookupStore', () => {
  const key = 'score';
  const value1 = { a: 1, b: false, c: '3' };
  const value2 = { a: 3, b: true, c: '5' };

  test('Normal SyncStore functionality', async () => {
    const LS = LookupStore(key, value1);
    expect(await LS.get()).toStrictEqual(value1);
    expect(await backend.get(LS.key)).toStrictEqual(value1);
    await LS.set(value2);
    expect(await LS.get()).toStrictEqual(value2);
    expect(await backend.get(LS.key)).toStrictEqual(value2);
  });

  test('getItem()', async () => {
    const LS = LookupStore(key, value1);
    expect(await LS.getItem<number>('a')).toBe(1);
    expect(await LS.getItem<boolean>('b')).toBe(false);
    expect(await LS.getItem<string>('c')).toBe('3');
  });

  test('setItem()', async () => {
    const LS = LookupStore(key, value1);
    await LS.setItem<boolean>('b', true);
    expect(await LS.getItem<boolean>('b')).toBe(true);
    expect(await backend.get(LS.key)).toStrictEqual({ a: 1, b: true, c: '3' });
  });
});
