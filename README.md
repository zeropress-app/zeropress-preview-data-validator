# @zeropress/preview-data-validator

![npm](https://img.shields.io/npm/v/%40zeropress%2Fpreview-data-validator)
![license](https://img.shields.io/npm/l/%40zeropress%2Fpreview-data-validator)
![node](https://img.shields.io/node/v/%40zeropress%2Fpreview-data-validator)

Validate ZeroPress Preview Data v0.7 before building or previewing a site.
ESM with TypeScript definitions.

## Install

```bash
npm install @zeropress/preview-data-validator
```

## Usage

```js
import { readFile } from 'node:fs/promises';
import { validatePreviewData } from '@zeropress/preview-data-validator';

const data = JSON.parse(await readFile('./zeropress-preview-data.json', 'utf8'));
const result = validatePreviewData(data);

if (!result.ok) {
  for (const { code, path, message } of result.errors) {
    console.error(`${path}: ${message} (${code})`);
  }
}
```

Validation does not modify the input or insert defaults.

## API

All exports are available from `@zeropress/preview-data-validator`.

| Export | Behavior |
| --- | --- |
| `PREVIEW_DATA_VERSION` | Supported data version: `"0.7"`. |
| `validatePreviewData(data)` | Returns `{ ok, errors, warnings }`. Issues contain `code`, `path`, `message`, and `severity`. |
| `assertPreviewData(data)` | Returns the input when valid; otherwise throws an error describing the first issue. |
| `isPreviewData(data)` | Returns whether the input is valid; also works as a TypeScript type guard. |
| `canonicalizePreviewDataKeyOrder(data)` | Returns a deep copy with known keys in schema order and named-map and open-object keys in lexical order. |

Key ordering preserves array order and values. It does not validate or normalize the payload.

## Data contract

- [Preview Data v0.7 specification](https://zeropress.dev/reference/preview-data/specs/v0.7/)
- [JSON Schema](https://schemas.zeropress.dev/preview-data/v0.7/schema.json)
- [TypeScript definitions](src/index.d.ts)

Use the runtime validator for full validation, including cross-record references,
normalized uniqueness, and date and URL rules that JSON Schema alone does not enforce.

The schema is also available as a package export:

```js
import schema from '@zeropress/preview-data-validator/preview-data.v0.7.schema.json' with { type: 'json' };
```

## License

MIT
