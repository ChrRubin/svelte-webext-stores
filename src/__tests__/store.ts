import { storageLegacy } from '../storage-backend';
import { webExtStores } from '../store';

describe('SyncStore', () => {
  const backend = storageLegacy();
  const stores = webExtStores(backend);
  const SyncStore = stores.newSyncStore;

  beforeEach(async () => await stores.clear());

  test('Default value', async () => {
    const store = SyncStore('hey', 'listen');
    expect(await store.get()).toBe('listen');
  });

  test('Get and set', async () => {
    const store = SyncStore('hey', 'listen');
    await store.set('watch out');
    expect(await store.get()).toBe('watch out');
  });

  test('Saves to storage', async () => {
    const store = SyncStore('hey', 'listen');
    // expect(await backend.get('hey')).toBe('listen');
    await store.set('watch out');
    expect(await backend.get('hey')).toBe('watch out');
  });

  test('Loads from storage', async () => {
    await backend.set('hey', 'watch out');
    const store = SyncStore('hey', 'listen');
    expect(await store.get()).toBe('watch out');
  });

  test('Syncs with storage changes', async () => {
    const store = SyncStore('hey', 'listen');
    await backend.set('hey', 'watch out');
    expect(await store.get()).toBe('watch out');
  });

  test('Reset', async () => {
    const store = SyncStore('hey', 'listen');
    await store.set('take this');
    expect(await store.get()).toBe('take this');
    expect(await backend.get('hey')).toBe('take this');
    await store.reset();
    expect(await store.get()).toBe('listen');
    expect(await backend.get('hey')).toBe('listen');
  });
});
