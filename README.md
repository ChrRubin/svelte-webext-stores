# svelte-webext-stores

Svelte stores that are synchronized with extension storage.

Note: *This library is currently in alpha development, and is subject to breaking changes with or without warning.*

## Features

- **Different storage types support:** `chrome.storage` (either MV2 or MV3), `browser.storage` (including [webextension-polyfill](https://github.com/mozilla/webextension-polyfill)), and even non-extension storage such as `window.localStorage` and `window.sessionStorage` are supported out of the box.
- **Automatically synchronizes** to and from storage backend.
- **TypeScript support:** This library is fully written in TypeScript, and the distributed package includes TypeScript declarations.
- **Custom implementations:** Create and use your own custom storage backends or synchronized stores by implementing `IStorageBackend` or `ISyncStore` respectively.

## Getting started

### Installation

`npm install -D svelte-webext-stores`

or

`yarn add -D svelte-webext-stores`

### Quick Usage

`storage.js`

```javascript
import { webExtStores } from 'svelte-webext-stores';

// Instantiate default store handler, which is backed by MV2 chrome.storage.local
const stores = webExtStores();
// Register a new synchronized store with storage key 'count' and default value of 1
export const count = stores.addSyncStore('count', 1);
```

`App.svelte`

```html
<script>
  import { count } from './storage.js';

  function addCount() {
    $count += 1;
  }
</script>

<button on:click={addCount}>Count: {$count}</button>
```

## Advanced Usage

Note: *The following documentation is a WIP.*

### Storage Backends

This package supports and exports the following storage options out of the box. To use a provided storage options, simply import it and pass it into `webExtStores`.

| Storage | Description |
| --- | --- |
| `storageMV2` | Chrome Manifest Version 2 (callback API). |
| `storageMV3` | Chrome Manifest Version 3 (Promise API). |
| `storageWebExt` | Mozilla WebExtension (browser API), including [webextension-polyfill](https://github.com/mozilla/webextension-polyfill). |
| `storageLegacy` | Legacy/non-extension storage (`localStorage` or `sessionStorage`). |

To set the storage area/type, pass the corresponding string parameter.

| Storage | Allowed parameter | Default
| --- | --- | --- |
| `storageMV2`, `storageMV3`, `storageWebExt` | `'local'` \| `'sync'` \| `'managed'` | `'local'` |
| `storageLegacy` | `'session'` \| `'local'` | `'session'`

Example:

```js
import { webExtStores, storageWebExt } from 'svelte-webext-stores';

// Uses the Mozilla WebExtension browser API in the 'sync' area.
const stores = webExtStores(storageWebExt('sync'));
```

#### `IStorageBackend`

All of the above storage backends implements the `IStorageBackend` interface contract. To use a custom storage backend, implement the same contract as follows and pass it into `webExtStores`:

| Method | Signature | Description |
| --- | --- | --- |
| get | `get<T>(key: string): Promise<T \| undefined>` | Get value from storage backend. |
| set | `set<T>(key: string, value: T): Promise<void>` | Set value in storage backend. |
| addOnChangedListener | `addOnChangedListener(callback: OnChangedCallback): void` | Add listener for storage change events. More info below. |
| cleanUp | `cleanUp(): void` | Perform clean up operations. |
| remove | `remove(key: string): Promise<void>` | Remove item from storage. |
| clear | `clear(): Promise<void>` | Clears all stored values from storage backend. |

The callbacks added by `addOnChangedListener` must be called whenever any value changes in the storage. The callback signature is as follows:

`(changes: {[key: string]: { newValue?: any, oldValue?: any }}) => void`

### Synchronized Stores

#### `ISyncStore`

All provided synchronized stores implements the `ISyncStore` interface contract. To use a custom synchronized store, implement the same contract as follows. Note that `ISyncStore` also extends Svelte's `Readable`, so you also have to implement its `subscribe` method.

| Method | Signature | Description |
| --- | --- | --- |
| get | `get: () => Promise<T>` | Get current value after updating from backend. |
| set | `set: (value: T) => Promise<void>` | Set value, inform subscribers, and push to storage. |
| getCurrent | `getCurrent: () => T` | Get current value without updating from backend. Used for comparing storage changes when syncing from storage. |

| Property | Type | Description |
| --- | --- | --- |
| syncFromExternal | boolean | Whether store should be updated when storage value is updated externally, e.g. storage value is changed by another page. |
| key | string | Storage key. |

#### `SyncStore`

Standard store that synchronizes to the storage backend. Uses Svelte `writable` to implement the Svelte store contract.

```ts
WebExtStores.addSyncStore<T>(
  key: string,
  defaultValue: T,
  syncFromExternal = true,
  versionedOptions?: VersionedOptions
): SyncStore<T>
```

##### Parameters

| Parameter | Description |
| --- | --- |
| key | Storage key |
| defaultValue | Store's default value |
| syncFromExternal | Whether store should be updated when storage value is updated externally |
| versionedOptions | Enables options for migrating storage values from an older version to a newer version |

##### Methods

All of `ISyncStore` and:

| Methods | Signature | Description |
| --- | --- | --- |
| ready | `() => Promise<void>` | Ensure that any async initialization process (such as initial update from backend) has been completed. You typically don't need to manually call this unless you wish to sync the store to the storage backend before any of `get()`, `set()` or `subscribe()` is called. |
| reset | `() => Promise<void>` | Reset store value to default value. |

#### Versioned Store Values and Migration

`SyncStore` and its derivatives has the optional parameter `versionedOptions`. When the parameter is provided, it keeps track of the current store's version to enable ease of migrating values from an older store version to the current version. This can be useful to migrate breaking changes on the stored data without reseting its value to default.

`VersionedOptions` properties are as follows:

| Property | Type | Descrption |
| --- | --- | --- |
| version | number | Current version number. Do not use `-1`. |
| seperator | string | Separator between key and version. |
| migrations | `Map<number, (oldValue: any) => T>` | Map for migrating values. Keys are the old version to match against, and values are callbacks that accepts the value found from the given old version and returns the corresponding value for the current version. Use the key `-1` to migrate from a versionless store. |

SyncStores that are provided with the `versionedOptions` parameter are stored as `${key}${seperator}${version}` internally. When an older version that matches any of the keys in the Map is found, its value is passed to the callback, the migrated value is stored and the old version is removed.

```js
// Initial store
export const size = stores.addSyncStore('size', 500);

// Example usage in svelte
window.resizeTo($size, $size);
```

```js
// To migrate to a new value, replace the old declaration
const sizeMigrations = new Map();
sizeMigrations.set(-1, (oldValue) => `${oldValue}x${oldValue * 2}`);

export const size = stores.addSyncStore(
  'size',
  '500x1000',
  true,
  {
    version: 1,
    seperator: '$',
    migrations: sizeMigrations
  }
);

// Example usage in svelte
const [width, height] = $size.split('x');
window.resizeTo(width, height);
```
