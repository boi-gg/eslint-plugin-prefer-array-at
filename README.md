# [Exception](.)

![npm bundle size](https://img.shields.io/bundlephobia/min/@boi.gg/exception)
![NPM Unpacked Size](https://img.shields.io/npm/unpacked-size/@boi.gg/exception)
![NPM Version](https://img.shields.io/npm/v/@boi.gg/exception)
![NPM Downloads](https://img.shields.io/npm/dy/@boi.gg/exception)
![Jest Coverage](https://img.shields.io/badge/coverage-100%25-green?logo=jest)

A tiny, typed, and modular exception-handling library for TypeScript.

## Features

- **Type-Safe**: Associate metadata with your exceptions and get full type-safety.
- **Modular**: Create and reuse exception kinds across your application.
- **Lightweight**: Tiny footprint, no dependencies.
- **Isomorphic**: Works in any JavaScript environment.

## Installation

```bash
pnpm add @boi.gg/exception
```

## Usage

The core of the library is the `Exception` class. You can create your own exception "kinds" using the static `Exception.kind` method.

### Creating Exception Kinds

`Exception.kind` creates a new subclass of `Exception`. This allows you to group and handle exceptions by their kind.

```ts
import { Exception } from "@boi.gg/exception";

// Create a simple exception kind
const UnauthorizedException = Exception.kind("UnauthorizedException");

// Create an exception kind with typed metadata
type NotFoundMeta = { path: string; method: "GET" | "POST" | "PUT" | "DELETE" };
const NotFoundException = Exception.kind<NotFoundMeta>("NotFoundException");
```

### Throwing Exceptions

You can then `throw` new instances of your custom exception kinds. The constructor signature is `new Exception(message, meta?, cause?)`.

```ts
// Throw a simple exception
throw new UnauthorizedException("You must be logged in to perform this action.");

// Throw an exception with metadata and a cause
const err = await api.get("/resource/123").catch((e) => e);
throw new NotFoundException("Resource not found", { path: "/resource/123", method: "GET" }, err);
```

### Matching and Handling Exceptions

Use the static `.match()` method on an exception kind to check if an exception is an instance of that kind. This is a type-safe way to handle specific exceptions.

```ts
import { Exception } from "@boi.gg/exception";

const NotFoundException = Exception.kind<{ path: string }>("NotFoundException");

try {
  // ... some code that might throw
} catch (exception) {
  if (NotFoundException.match(exception)) {
    // `exception` is now typed as an instance of NotFoundException
    console.error(`Resource not found at path: ${exception.meta.path}`);
    console.error(`Original cause:`, exception.cause);
  } else {
    // Handle other errors or re-throw
    throw exception;
  }
}
```

## API

### `Exception.kind<Meta>(name)`

- `Meta` (optional): A generic type for the `meta` property of the exception.
- `name`: `string` - The name of the exception kind. This will be the `name` property on instances.
- **Returns**: A new exception class that extends `Exception`.

### `new CustomException(message, meta?, cause?)`

- `message`: `string` - The exception message.
- `meta` (optional): An object containing additional information about the exception. The type is defined by the `Meta` generic when creating the kind. The `meta` object will be frozen.
- `cause` (optional): `Error | string | undefined` - The original error that caused this exception.

### `CustomException.match(instance)`

- `instance`: `unknown` - The value to check.
- **Returns**: `boolean` - `true` if the `instance` is an instance of `CustomException`. This also acts as a type guard.
