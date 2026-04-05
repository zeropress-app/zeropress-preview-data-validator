# @zeropress/preview-data-validator

![npm](https://img.shields.io/npm/v/%40zeropress%2Fpreview-data-validator)
![license](https://img.shields.io/npm/l/%40zeropress%2Fpreview-data-validator)
![node](https://img.shields.io/node/v/%40zeropress%2Fpreview-data-validator)

Shared validation core for ZeroPress preview data v0.4.

This package is the canonical runtime contract for preview payloads consumed by:

- `zeropress-theme dev`
- `zeropress-admin-api-v2`

## Install

```bash
npm install @zeropress/preview-data-validator
```

## Exports

```js
import {
  PREVIEW_DATA_VERSION,
  assertPreviewData,
  isPreviewData,
  validatePreviewData,
} from '@zeropress/preview-data-validator';
```

Schema export:

```js
import schemaUrl from '@zeropress/preview-data-validator/preview-data.v0.4.schema.json';
```

`preview-data v0.4` is data-only:

- no `routes` block
- no raw `*_html` fragments on posts
- no preformatted `published_at` / `updated_at`
- taxonomy membership is expressed as `category_slugs` and `tag_slugs`

Build tooling is responsible for deriving render-ready route data from this compact artifact.

## API

### `validatePreviewData(data)`

Returns:

```js
{
  ok: true,
  errors: [],
  warnings: []
}
```

### `assertPreviewData(data)`

Throws when the payload is invalid.

### `isPreviewData(data)`

Returns `true` when the payload is valid.

## License

MIT
