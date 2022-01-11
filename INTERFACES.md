# Interfaces

The following are interfaces that can be used for your own custom implementations.

## `IStorageBackend`

All provided storage backends implements the `IStorageBackend` interface. To use a custom storage backend, implement the interface as follows:

| Method | Signature | Description |
| --- | --- | --- |
| get | `get: <T>(key: string) => Promise<T \| undefined>` | Get value from storage backend. |
| set | `set: <T>(key: string, value: T) => Promise<void>` | Set value in storage backend. |
| addOnChangedListener | `addOnChangedListener: (callback: OnChangedCallback) => void` | Add listener for storage change events. More info below. |
| cleanUp | `cleanUp: () => void` | Perform clean up operations. |
| remove | `remove: (key: string) => Promise<void>` | Remove item from storage. |
| clear | `clear: () => Promise<void>` | Clears all stored values from storage backend. |

The callbacks added by `addOnChangedListener` must be called whenever any value changes in the storage. The callback signature is as follows:

`(changes: {[key: string]: { newValue?: any, oldValue?: any }}) => void`

To use your custom storage backend, simply pass it as a parameter into `webExtStores()`.

```js
import { webExtStores } from 'svelte-webext-stores';

const customBackend = {
  // Implementation
};

const stores = webExtStores(customBackend);
```

## `ISyncStore`

All provided synchronized stores implements the `ISyncStore` interface. To use a custom synchronized store, implement the interface as follows.

Note that `ISyncStore` also extends Svelte's `Readable`, so you also have to implement its `subscribe` method.

| Method | Signature | Description |
| --- | --- | --- |
| get | `get: () => Promise<T>` | Get current value after updating from backend. |
| set | `set: (value: T) => Promise<void>` | Set value, inform subscribers, and push to storage. |
| getCurrent | `getCurrent: () => T` | Get current value without updating from backend. Used for comparing storage changes when syncing from storage. |

| Property | Type | Description |
| --- | --- | --- |
| syncFromExternal | boolean | Whether store should be updated when storage value is updated externally, e.g. storage value is changed by another page. |
| key | string | Storage key. |

To use and register your custom synchronized store, call the `WebExtStores.addCustomStore()` method, which accepts a callback function that provides the handler's backend object.

```js
import { webExtStores } from 'svelte-webext-stores';

function customSyncStore(key, defaultValue, backend) {
  // Implementation
}

const stores = webExtStores();

export const count = stores.addCustomStore((backend) => customSyncStore('count', 1, backend));
```

## `ILookupStore`

`ILookupStore` is an interface that extends any `ISyncStore` implementation, with the additional `getItem` and `setItem` convenience methods to work with stored `Record<string, any>` objects. `LookupStore` is simply an `ILookupStore` that extends `SyncStore`.

To add the convenience methods to your own custom `ISyncStore` implementation, import and use `addLookupMethods`:

```js
import { webExtStores } from 'svelte-webext-stores';

function customSyncStore(key, defaultValue, backend) {
  // Implementation
}

const stores = webExtStores();

export const obj = stores.addCustomStore(
  (backend) => addLookupMethods(
    customSyncStore('obj', { a: 1, b: false, c: '3' }, backend)
  )
);
```
