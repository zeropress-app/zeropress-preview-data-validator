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

The following main-entry exports are available from `@zeropress/preview-data-validator`.

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
- [JSON Schema](https://www.schemastore.org/zeropress-preview-data-0.7.json)
- [TypeScript definitions](src/index.d.ts)

Use the runtime validator for full validation, including cross-record references,
normalized uniqueness, and date and URL rules that JSON Schema alone does not enforce.

The schema is also available as a package export:

```js
import schema from '@zeropress/preview-data-validator/preview-data.v0.7.schema.json' with { type: 'json' };
```

## Chunk transport and incremental validation

Preview Data v0.7 remains the logical document contract. Chunk transport version
1 is a separate file format, available through `@zeropress/preview-data-validator/chunks`.
It does not add fields to the Preview Data schema.

A manifest has `format: "zeropress-preview-data-chunks"`, `format_version: 1`,
`generation` (a local relative directory), `data` (the document without `content`),
and `content` descriptors. Required collections are `authors`, `posts`, `pages`,
`categories`, and `tags`; `media` remains optional. Each collection has a `count`
and ordered `chunks`, each containing `file`, `records`, `bytes`, and `sha256`.
Chunk files contain complete JSON arrays. Empty collections have zero chunks.
Record order and optional-field presence are preserved.

- Writers target 4 MiB per chunk. A complete record may exceed that target,
  but a chunk cannot exceed 32 MiB, including formatting and the final newline.
  Records are never split or silently truncated.
- A manifest is limited to 16 MiB, including settings and inventory. Oversized
  records or headers fail with an error before constructing an unbounded JSON string.
- `createPreviewDataValidationSession(header)` uses the same field validators as
  whole-document validation. Call `add(collection, value)` for each record and
  `finish()` after all collections. It checks duplicate identities and global
  references, including forward references; IDs and reference metadata remain in memory.
- `createObjectPreviewDataSource(data)` adapts an existing object without changing
  it. A source exposes `header`, `collections`, replayable `records(name)` yielding
  `{value, index, location?}`, and `close()`. Consumers must finish iteration and validation.

The Node-only `@zeropress/preview-data-validator/node` entry provides
`openPreviewDataSource`, `readPreviewDataHeader`, `writePreviewDataChunks`,
`stagePreviewDataChunks`, and `createDiskWorkStore`. The main validation entry
has no filesystem dependency. Browser hosts can supply their own source and store.

Both chunk writers accept `preserveKeyOrder: true` to retain authored object-key
order, including menus and open `meta`/`data` maps. The default remains canonical
key ordering; record and array order are unchanged in either mode. This option
does not change validation, paths, size limits, counts or hashing. Transport size
failures have codes `PREVIEW_DATA_CHUNK_TOO_LARGE` and
`PREVIEW_DATA_MANIFEST_TOO_LARGE`; callers must not treat other validation or I/O
errors as permission to skip checks.

The reader captures a manifest once, checks bounded file sizes, hashes and counts,
and rejects traversal, absolute paths and symlinks within a generation. Header-only
reading does not read content chunks. Legacy JSON is accepted but still requires
whole-file parsing. Do not materialize all records merely to call the old object API.

The writer finalizes immutable `<name>.parts/g-<digest>/` files before replacing
the entry manifest. Identical imports reuse verified generations. Old generations
are retained for active readers; remove them only when no reader/build is running.
A failed manifest commit can leave an unreferenced generation, not a partial entry.
Callers using `stagePreviewDataChunks` own the final manifest transaction and input
path protection. The one-shot writer atomically replaces its manifest.

`createDiskWorkStore()` uses an owned temporary directory and one append-only file.
Its default per-value guard is 128 MiB; `put/get` references and byte counters are
exposed without retaining values. Always close the store in `finally`. It is scratch
storage, not a public artifact or a persistent format. Memory is proportional to
catalog metadata plus bounded content batches, not constant for arbitrary sites.

## License

MIT
