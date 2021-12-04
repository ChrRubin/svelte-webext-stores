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

This package supports and exports the following storage options out of the box.

| Storage | Description |
| --- | --- |
| `storageMV2` | Chrome Manifest Version 2 (callback API). |
| `storageMV3` | Chrome Manifest Version 3 (Promise API). |
| `storageWebExt` | Mozilla WebExtension (browser API), including [webextension-polyfill](https://github.com/mozilla/webextension-polyfill). |
| `storageLegacy` | Legacy/non-extension storage (`localStorage` or `sessionStorage`). |

To set the storage area/type, pass the corresponding string as the function parameter.

| Storage | Allowed parameter | Default
| --- | --- | --- |
| `storageMV2`, `storageMV3`, `storageWebExt` | `'local'` \| `'sync'` \| `'managed'` | `'local'` |
| `storageLegacy` | `'session'` \| `'local'` | `'session'`

To use a provided storage options, simply import it and pass it into `webExtStores`.

```js
import { webExtStores, storageWebExt } from 'svelte-webext-stores';

// Uses the Mozilla WebExtension browser API in the 'sync' area.
const stores = webExtStores(storageWebExt('sync'));
```

To use a custom storage backend, implement the `IStorageBackend` interface contract as follows:

| Function | Signature | Description |
| --- | --- | --- |
| get | `get<T>(key: string): Promise<T \| undefined>` | Get value from storage backend. |
| set | `set<T>(key: string, value: T): Promise<void>` | Set value in storage backend. |
| addOnChangedListener | `addOnChangedListener(callback: OnChangedCallback): void` | Add listener for storage change events. More info below. |
| cleanUp | `cleanUp(): void` | Perform clean up operations. |
| remove | `remove(key: string): Promise<void>` | Remove item from storage. |
| clear | `clear(): Promise<void>` | Clears all stored values from storage backend. |

The callback functions added by `addOnChangedListener` must be called whenever any value changes in the storage. The callback function signature is as follows:

`(changes: {[key: string]: { newValue?: any, oldValue?: any }}) => void`
