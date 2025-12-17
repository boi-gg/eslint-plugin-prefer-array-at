# eslint-plugin-prefer-array-at

<img width="1024" height="559" alt="image" src="https://github.com/user-attachments/assets/c8e01dc6-d215-40aa-896c-e0eec77dbb80" />

![npm bundle size](https://img.shields.io/bundlephobia/min/@boi.gg/eslint-plugin-prefer-array-at)
![NPM Unpacked Size](https://img.shields.io/npm/unpacked-size/@boi.gg/eslint-plugin-prefer-array-at)
![NPM Version](https://img.shields.io/npm/v/@boi.gg/eslint-plugin-prefer-array-at)
![NPM Downloads](https://img.shields.io/npm/dy/@boi.gg/eslint-plugin-prefer-array-at)
![Jest Coverage](https://img.shields.io/badge/coverage-0%25-red?logo=jest)

ESLint plugin to prefer `Array.prototype.at()` over traditional bracket indexing.

## Features

- **Modern Syntax**: Encourages the use of the modern `.at()` method for array access
- **Auto-fixable**: Automatically fixes bracket notation to use `.at()` method
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

## Rule: `prefer-array-at`

This rule enforces the use of `.at()` method instead of bracket notation for array element access with numeric literals.

### Examples

#### ❌ Incorrect

```ts
const array = [1, 2, 3];
console.log(array[0]); // Use array.at(0) instead

const fileList = new FileList();
console.log(fileList[0]); // Use fileList.at(0) or fileList.item(0) instead
```

#### ✅ Correct

```ts
const array = [1, 2, 3];
console.log(array.at(0)); // Using .at() method

const fileList = new FileList();
console.log(fileList.item(0)); // Using .item() for array-like objects
```

### Auto-fix

This rule is auto-fixable. Running ESLint with the `--fix` option will automatically convert bracket notation to `.at()` method:

```bash
eslint --fix .
```

## Why use `.at()`?

The `.at()` method provides several advantages:

1. **Negative indexing**: `.at(-1)` gets the last element, `.at(-2)` gets the second-to-last, etc.
2. **Consistency**: Provides a uniform way to access array elements
3. **Modern JavaScript**: Part of the ES2022 standard

## License

MIT
