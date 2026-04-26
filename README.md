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

- root `$schema` is optional and may be used as an editor/tooling hint
- no `routes` block
- no raw `html` fields on posts or pages
- no preformatted `published_at` / `updated_at`
- taxonomy membership is expressed as `category_slugs` and `tag_slugs`
- per-post comment policy is expressed as `allow_comments`
- authors are deduplicated in `content.authors[]`
- posts reference authors via `author_id`
- post `public_id` values are positive unique integers
- body source is carried as raw `content` with explicit `document_type`
- posts and pages may carry optional generator-defined scalar metadata in `meta`
- `site.permalinks` may define URL/output policy for posts, pages, categories, and tags
- pages may carry optional `path` for nested page URLs
- pages, categories, and tags do not carry internal `id` fields
- `site.mediaBaseUrl` is required and must be either an empty string or an absolute URI
- site locale is carried as `site.locale`
- site timezone is carried as `site.timezone`
- comment rendering policy is carried as `site.disallowComments`
- enabled menus are exported in root `menus`
- `menus` is keyed by stable `menu_id`
- menu items use `title`, `url`, `type`, `target`, and recursive `children`
- menu item `target` is `_self` or `_blank`
- menu items do not carry admin-only fields such as `reference_id`
- enabled widget areas are exported in root `widgets`
- `widgets` is keyed by stable `widget_area_id`
- widget items intentionally fix only the common shell: `type`, `title`, and optional `settings`
- widget-type-specific `settings` structure is not enforced by this validator in v0.5
- optional `custom_css` carries site-level stylesheet input as `{ content }`

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
