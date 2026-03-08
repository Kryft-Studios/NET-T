[Read Docs](https://briklab-docs.pages.dev/packages/net-t/introduction)
[Github Repository](https://github.com/Kryft-Studios/NET-T)

# @briklab/net-t

**@briklab/net-t** provides compact binary serialization for arrays of numbers, automatically choosing the most efficient numeric type for each value. Optimized for low-latency, low-memory communication structures.

## Install

Follow the [common installation tutorial](https://briklab-docs.pages.dev/packages/common-installation-tutorial)

## API

- **Functions**: [bint()](https://briklab-docs.pages.dev/packages/net-t/functions/bint) - Creates a new BintInstance
- **Functions**: [bint.fromBuffer()](https://briklab-docs.pages.dev/packages/net-t/functions/bint-fromBuffer) - Creates a BintInstance from an ArrayBuffer
- **Type**: [BintInstance](https://briklab-docs.pages.dev/packages/net-t/types/bintinstance) - The main interface for working with binary number arrays
- **Type**: [TypeName](https://briklab-docs.pages.dev/packages/net-t/types/typename) - Union type of supported numeric types

## Quick Start

```ts
import bint from '@briklab/net-t';

const instance = bint();
instance(42);        // Uint8
instance(3.14);      // Float32
instance(1000000);   // Uint32

const buffer = instance.toBuffer();
const restored = bint.fromBuffer(buffer);
console.log(restored.length); // 3
```