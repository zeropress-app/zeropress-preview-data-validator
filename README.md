# @zeropress/preview-data-validator

![npm](https://img.shields.io/npm/v/%40zeropress%2Fpreview-data-validator)
![license](https://img.shields.io/npm/l/%40zeropress%2Fpreview-data-validator)
![node](https://img.shields.io/node/v/%40zeropress%2Fpreview-data-validator)

Shared validation core for ZeroPress preview data v0.6.

This package is the canonical runtime contract for preview payloads consumed directly by:

- [@zeropress/build-core](https://www.npmjs.com/package/@zeropress/build-core)
- `zeropress-admin-api-v2`

Public contract references:

- [Preview Data v0.6 Spec](https://zeropress.dev/spec/preview-data-v0.6.html)
- [Preview Data v0.6 Schema](https://schemas.zeropress.dev/preview-data/v0.6/schema.json)

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
import schemaUrl from '@zeropress/preview-data-validator/preview-data.v0.6.schema.json';
```

Published schema files are shipped from the package `schemas/` directory.

`preview-data v0.6` is data-only:

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
- `site`, posts, and pages may carry optional generator-defined scalar metadata in `meta`
- posts and pages may carry optional structured JSON content in `data` for repeated theme UI blocks
- posts and pages may carry optional `discoverability`: `default`, `noindex`, or `delist`
- `site.permalinks` may define URL/output policy for posts, pages, categories, and tags
- pages may carry optional `path` for nested page URLs
- pages may carry optional `updated_at_iso` for page update metadata and sitemap `lastmod`
- pages, categories, and tags do not carry internal `id` fields
- `site.media_base_url` is required and must be either an empty string or an absolute URI
- optional `site.media_delivery_mode` may be `none` or `media_domain`
- optional `site.favicon` may carry `icon`, `svg`, `png`, and `apple_touch_icon` URLs for HTML head output
- optional `site.logo` may carry theme-facing site identity data as `{ src, alt }`
- optional `site.newsletter` may carry theme-facing newsletter CTA/island data; ZeroPress does not implement provider submit behavior
- optional `site.expose_generator` controls whether generated HTML exposes the ZeroPress generator meta tag
- optional `site.search` controls whether native static search may be enabled when the active theme supports search
- site locale is carried as `site.locale`
- site timezone is carried as `site.timezone`
- datetime display preference is carried as `site.datetime_display`
- fallback datetime formatting uses `site.date_style` and `site.time_style` Intl style presets
- comment rendering policy is carried as `site.disallow_comments`
- fallback `robots.txt` indexing policy may be carried as optional `site.indexing`
- enabled menus may be exported in optional root `menus`
- `menus` is keyed by stable `menu_id`
- menu items use `title`, `url`, `target`, optional scalar `meta`, and recursive `children`
- menu item `type` is optional origin metadata accepted in v0.6 for compatibility, but planned for removal in v0.7
- menu item `target` is `_self` or `_blank`
- menu items do not carry admin-only fields such as `reference_id`
- enabled widget areas may be exported in optional root `widgets`
- `widgets` is keyed by stable `widget_area_id`
- widget items intentionally fix only the common shell: `type`, `title`, and optional `settings`
- widget-type-specific `settings` structure is not enforced by this validator in v0.6
- named page/post collections may be exported in optional root `collections`
- `collections` is keyed by stable collection ids and contains ordered `{ type, slug }` item references
- managed media metadata may be exported in optional `content.media[]`
- media registry items use `src`, positive integer `width`, positive integer `height`, and optional `alt`
- optional `custom_css` carries site-level stylesheet input as `{ content }`
- optional `custom_html` carries trusted site-level HTML injection slots as `{ head_end: { content }, body_end: { content } }`

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
