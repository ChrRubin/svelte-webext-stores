import {
  StorageBackend,
  WebExtStorageArea,
  WebStorageType,
  StorageMV2,
  StorageMV3,
  StorageWebExt,
  StorageLegacy
} from '../storage-backend';

const webExtAreas: WebExtStorageArea[] = ['sync', 'local', 'managed'];
const webStorageType: WebStorageType[] = ['local', 'session'];

async function testBackend(backend: StorageBackend): Promise<void> {
  afterEach(async () => await Promise.all([
    backend.clear(), backend.cleanUp()
  ]));

  test.each([
    ['string', 'lorem', 'ipsum'],
    ['number', 'one', 1],
    ['boolean', 'yes', true],
    ['array', 'fish', ['cat', 'gold', 'silver', 'jelly']],
    ['object', 'score', { a: 1, b: 2, c: 3 }]
  ])('set(), get(): %s', async (name, key, value) => {
    await backend.set(key, value);
    expect(await backend.get(key)).toStrictEqual(value);
  });

  test('clear()', async () => {
    await backend.set('asda', 'qweq');
    await backend.clear();
    expect(await backend.get('asda')).toBe(undefined);
  });

  // NOTE: jest-webextension-mock does not properly mock storage event listeners
  // as of this writing.

  // test('addOnChangedListener()', () => {
  //   function callback(changes: StorageChanges): void {
  //     expect(changes).toBe({ map: { oldValue: 'wasd', newValue: 'hjkl' } });
  //     try {
  //       expect(changes).toBe({ map: { oldValue: 'wasd', newValue: 'hjkl' } });
  //       done();
  //     } catch (e) {
  //       done(e);
  //     }
  //   }
  //   backend.set('map', 'wasd');
  //   backend.addOnChangedListener(callback);
  //   backend.set('map', 'hjkl');
  // });

  test('remove()', async () => {
    await backend.set('trash', 'bin');
    await backend.remove('trash');
    expect(await backend.get('trash')).toBe(undefined);
  });
}

describe.each([
  ['MV2', StorageMV2, webExtAreas],
  ['MV3', StorageMV3, webExtAreas],
  ['WebExtensions', StorageWebExt, webExtAreas]
])('Backend: %s', (name, BackendConstructor, areas) => {
  describe.each(areas)('Area: %s', (area) => {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    testBackend(new BackendConstructor(area));
  });
});

describe('Backend: Legacy', () => {
  describe.each(webStorageType)('Area: %s', (area) => {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    testBackend(new StorageLegacy(area));
  });
});
