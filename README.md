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

More documentation coming soon.
