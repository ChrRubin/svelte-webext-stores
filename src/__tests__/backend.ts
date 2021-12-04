import {
  IStorageBackend,
  storageMV2,
  storageMV3,
  storageWebExt,
  storageLegacy
} from '../storage';
import { WebExtStorageArea } from '../storage/web-extension';
import { WebStorageType } from '../storage/legacy';

const webExtAreas: WebExtStorageArea[] = ['sync', 'local', 'managed'];
const webStorageType: WebStorageType[] = ['local', 'session'];

async function testBackend(backend: IStorageBackend): Promise<void> {
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
  ['MV2', storageMV2, webExtAreas],
  ['MV3', storageMV3, webExtAreas],
  ['WebExtensions', storageWebExt, webExtAreas]
])('Backend: %s', (name, backend, areas) => {
  describe.each(areas)('Area: %s', (area) => {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    testBackend(backend(area));
  });
});

describe('Backend: Legacy', () => {
  describe.each(webStorageType)('Area: %s', (area) => {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    testBackend(storageLegacy(area));
  });
});
