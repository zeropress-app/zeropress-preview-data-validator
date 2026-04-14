# @zeropress/preview-data-validator

![npm](https://img.shields.io/npm/v/%40zeropress%2Fpreview-data-validator)
![license](https://img.shields.io/npm/l/%40zeropress%2Fpreview-data-validator)
![node](https://img.shields.io/node/v/%40zeropress%2Fpreview-data-validator)

Shared validation core for ZeroPress preview data v0.5.

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
import schemaUrl from '@zeropress/preview-data-validator/preview-data.v0.5.schema.json';
```

Published schema files are shipped from the package `schemas/` directory.

`preview-data v0.5` is data-only:

- no `routes` block
- no raw `html` fields on posts or pages
- no preformatted `published_at` / `updated_at`
- taxonomy membership is expressed as `category_slugs` and `tag_slugs`
- per-post comment policy is expressed as `allow_comments`
- authors are deduplicated in `content.authors[]`
- posts reference authors via `author_id`
- body source is carried as raw `content` with explicit `document_type`
- `site.mediaBaseUrl` is required and must be either an empty string or an absolute URI
- site locale is carried as `site.locale`
- site timezone is carried as `site.timezone`
- comment rendering policy is carried as `site.disallowComments`

Build tooling is responsible for resolving authors and deriving render-ready route data, including HTML conversion for non-HTML source content.

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
