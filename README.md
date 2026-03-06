# eslint-plugin-prefer-array-at

<img width="1024" height="559" alt="image" src="https://github.com/user-attachments/assets/c8e01dc6-d215-40aa-896c-e0eec77dbb80" />

![npm bundle size](https://img.shields.io/bundlephobia/min/@boi.gg/eslint-plugin-prefer-array-at)
![NPM Unpacked Size](https://img.shields.io/npm/unpacked-size/@boi.gg/eslint-plugin-prefer-array-at)
![NPM Version](https://img.shields.io/npm/v/@boi.gg/eslint-plugin-prefer-array-at)
![NPM Downloads](https://img.shields.io/npm/dy/@boi.gg/eslint-plugin-prefer-array-at)
![Jest Coverage](https://img.shields.io/badge/coverage-0%25-red?logo=jest)

ESLint plugin to prefer method-based indexed access (`.at()` / `.item()`) over traditional bracket indexing.

## Features

- **Modern Syntax**: Encourages `.at()` / `.item()` method access for index reads
- **Auto-fixable**: Automatically fixes supported bracket notation to `.at()` / `.item()`
- **Type-Safe**: Works seamlessly with TypeScript and JavaScript
- **Zero Dependencies**: Lightweight with no external dependencies

## Installation

```bash
pnpm add -D @boi.gg/eslint-plugin-prefer-array-at
```

```bash
npm install --save-dev @boi.gg/eslint-plugin-prefer-array-at
```

```bash
yarn add -D @boi.gg/eslint-plugin-prefer-array-at
```

## Usage

### ESLint Flat Config (eslint.config.js)

```js
import preferArrayAt from "@boi.gg/eslint-plugin-prefer-array-at";

export default [
  {
    plugins: {
      "prefer-array-at": preferArrayAt,
    },
    rules: {
      "prefer-array-at/prefer-array-at": "warn",
    },
  },
];
```

Or use the recommended config:

```js
import preferArrayAt from "@boi.gg/eslint-plugin-prefer-array-at";

export default [preferArrayAt.configs.recommended];
```

If you also want warnings for unsupported numeric indexing on `DOMTokenList` and `arguments`, use the `all` config:

```js
import preferArrayAt from "@boi.gg/eslint-plugin-prefer-array-at";

export default [preferArrayAt.configs.all];
```

## Rule: `prefer-array-at`

This type-aware rule enforces method-based access (`.at()`/`.item()`) instead of bracket notation for numeric-literal indexing on:

- Arrays and tuples (`.at()`)
- `FileList`, `NodeList`/`NodeListOf`, `HTMLCollection`/`HTMLCollectionOf`, and `NamedNodeMap` (`.item()`)

In `all` config mode, it also warns (without auto-fix) on numeric-literal indexing for:

- `DOMTokenList`
- `arguments`

### Examples

#### ❌ Incorrect

```ts
const array = [1, 2, 3];
console.log(array[0]); // Use array.at(0) instead

const tuple: [number, number] = [1, 2];
console.log(tuple[0]); // Use tuple.at(0) instead

declare const fileList: FileList;
console.log(fileList[0]); // Use fileList.item(0) instead

declare const nodes: NodeListOf<Element>;
console.log(nodes[0]); // Use nodes.item(0) instead

declare const collection: HTMLCollectionOf<Element>;
console.log(collection[0]); // Use collection.item(0) instead

declare const map: NamedNodeMap;
console.log(map[0]); // Use map.item(0) instead

declare const tokenList: DOMTokenList;
console.log(tokenList[0]); // Warns in all config; no safe auto-fix

function fn() {
  return arguments[0]; // Warns in all config; no safe auto-fix
}
```

#### ✅ Correct

```ts
const array = [1, 2, 3];
console.log(array.at(0)); // Using .at() method

declare const fileList: FileList; // e.g. obtained from an <input type="file"> element
console.log(fileList.item(0)); // Using .item() for FileList access

declare const nodes: NodeListOf<Element>;
console.log(nodes.item(0));

declare const collection: HTMLCollectionOf<Element>;
console.log(collection.item(0));

declare const map: NamedNodeMap;
console.log(map.item(0));
```

### Auto-fix

This rule is auto-fixable for supported targets. Running ESLint with the `--fix` option will automatically convert bracket notation to `.at()` / `.item()` where safe:

```bash
eslint --fix .
```

## Why use `.at()`?

The `.at()` method provides several advantages:

0. **Type-safety**: `arr[number]` resolves to `T`, but it's actually `T | undefined`. `arr.at(number)` resolves to `T | null`
1. **Negative indexing**: `.at(-1)` gets the last element, `.at(-2)` gets the second-to-last, etc.
2. **Consistency**: Provides a uniform way to access array elements
3. **Modern JavaScript**: Part of the ES2022 standard

## License

MIT
