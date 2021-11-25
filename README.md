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

`npm install --save-dev svelte-webext-stores`

or

`yarn add --save-dev svelte-webext-stores`

### Usage

`storage.js`

```javascript
import { WebExtStores } from 'svelte-webext-stores';

// Instantiate default store handler, which is backed by MV2 chrome.storage.local
const stores = new WebExtStores();
// Register and export new synchronized store with storage key 'count' and default value of 1
export const count = stores.newSyncStore('count', 1);
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

## API Documentation

The following API documentation is a WIP.

### `WebExtStores`

```ts
new WebExtStores(backend: IStorageBackend = new StorageMV2()): WebExtStores
```

Handler for registering stores that are synced to storage. This handler will listen to storage changes and automatically update registered stores if needed.

`WebExtStores` provides the following functions to register synchronized stores. Please refer to their respective class documentation for more info.

| Store | Function |
| --- | --- |
| SyncStore | `newSyncStore<T>(key: string, defaultValue: T, syncFromExternal = true): SyncStore<T>` |
| ISyncStore | `addCustomStore(getStore: (backend: IStorageBackend) => ISyncStore<any>): void` |

### Storage Backends

This package supports and exports the following storage options out of the box:

| Storage Backend | Description |
| --- | --- |
| `StorageMV2` | Chrome Manifest Version 2 (callback API). |
| `StorageMV3` | Chrome Manifest Version 3 (Promise API). |
| `StorageWebExt` | Mozilla WebExtension (browser API), including [webextension-polyfill](https://github.com/mozilla/webextension-polyfill). |
| `StorageLegacy` | Legacy/non-extension storage (`localStorage` or `sessionStorage`). |

If you would like to use a custom storage backend, you must implement the `IStorageBackend` interface contract as follows:

#### get

``` ts
get<T>(key: string): Promise<T | undefined>
```

Get value from storage backend.

#### set

```ts
set<T>(key: string, value: T): Promise<void>
```

Set value in storage backend.

#### addOnChangedListener

```ts
addOnChangedListener(callback: OnChangedCallback): void
```

Add listener for storage change events.

#### cleanUp

```ts
cleanUp(): void
```

Perform clean up operations.

#### remove

```ts
async remove(key: string): Promise<void>
```

Remove item with given key from storage.

#### clear

```ts
async clear(): Promise<void>
```

Clears all stored values from storage backend.

