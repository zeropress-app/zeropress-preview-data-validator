# @zeropress/preview-data-validator

![npm](https://img.shields.io/npm/v/%40zeropress%2Fpreview-data-validator)
![license](https://img.shields.io/npm/l/%40zeropress%2Fpreview-data-validator)
![node](https://img.shields.io/node/v/%40zeropress%2Fpreview-data-validator)

Shared validation core for ZeroPress Preview Data v0.7.

This package is the canonical site-data contract for build and theme-preview payloads consumed directly by:

- [@zeropress/build-core](https://www.npmjs.com/package/@zeropress/build-core)
- `zeropress-studio-api`

Public contract references:

- [Preview Data v0.7 Spec](https://zeropress.dev/reference/preview-data/specs/v0.7/)
- [Preview Data v0.7 Schema](https://schemas.zeropress.dev/preview-data/v0.7/schema.json)

## Install

```bash
npm install @zeropress/preview-data-validator
```

## Exports

```js
import {
  PREVIEW_DATA_VERSION,
  assertPreviewData,
  canonicalizePreviewDataKeyOrder,
  isPreviewData,
  validatePreviewData,
} from '@zeropress/preview-data-validator';
```

Schema export:

```js
import schemaUrl from '@zeropress/preview-data-validator/preview-data.v0.7.schema.json';
```

Published schema files are shipped from the package `schemas/` directory.
The v0.7 schema is governed by the same private contract definitions used by the
manual runtime validator. `npm run check:schema` compares the committed
Schema with those definitions structurally. The committed file is generated
deterministically and keeps examples as its final top-level member for review.

`preview-data v0.7` is data-only:

- root `$schema` is optional and may be used as an editor/tooling hint
- no `routes` block
- no raw `html` fields on posts or pages
- no preformatted `published_at` / `updated_at`
- taxonomy membership is expressed as `category_slugs` and `tag_slugs`; post
  `tag_slugs` is an ordered display sequence whose values are unique after NFC
  normalization, while its first entry does not implicitly become a primary or
  SEO tag
- global `content.tags[]` order has no semantic meaning; generators should emit
  a stable ascending order by tag name and then slug
- Post and Page comment policy is expressed as optional `allow_comments`; omission means `false`, and producers should emit `true` only when comments are enabled for that item
- authors are deduplicated in `content.authors[]`
- posts reference authors via `author_id`
- post `public_id` values are positive unique integers
- pages may carry a positive `public_id` for comment-provider identity; it is required when page `allow_comments` is `true`
- body source is carried as raw `content` with explicit `document_type`
- `site`, posts, and pages may carry optional generator-defined scalar metadata in `meta`
- posts and pages may carry optional structured JSON content in `data` for repeated theme UI blocks
- posts and pages may carry optional `discoverability`: `default`, `noindex`, or `delist`
- `site.permalinks` may define URL/output policy for posts, pages, categories, and tags
- pages may carry optional `path` for nested page URLs; references use the
  effective route path rather than the leaf slug
- pages may carry optional `updated_at_iso` for page update metadata and sitemap `lastmod`
- posts, pages, categories, and tags do not carry internal `id` fields; Post `public_id` is the required public identity, while Page `public_id` is an optional public provider identity rather than an internal id
- slug-bearing fields and literal route segments accept Unicode letters,
  combining marks, decimal digits, `.`, `-`, and `_`, with at least one letter
  or digit; periods must be isolated and internal, so leading, trailing, and
  consecutive periods are rejected; decomposed input is accepted, while canonical
  results and the 200-code-point limit are based on NFC normalization
- `site.url` is required and must be either an empty string or a credential-free
  HTTP(S) origin without path, query, or fragment; canonical producers emit
  `URL.origin`
- `site.media_origin` is required and must be either an empty string or an
  absolute HTTP(S) origin with an optional port; credentials, non-root paths,
  query strings, and fragments are rejected, while an input trailing root slash
  is accepted and canonical payloads omit it
- navigation URLs accept credential-free HTTP(S) URLs or single-slash
  root-relative URLs, including `/`; media, favicon, logo, avatar, and
  featured-image URLs use the same policy but require a non-root path
- bare, dot-relative, protocol-relative, dot-segment, unsafe-character, and
  malformed-percent URLs are rejected
- optional `site.media_delivery_mode` may be `none` or `media_domain`; omission
  means `none`, and `media_domain` requires a non-empty `site.media_origin`
- optional `site.favicon` may carry default `icon`, `svg`, and `png` URLs, a dark color-scheme `icon_dark` URL, and an unconditional `apple_touch_icon` URL for HTML head output
- optional `site.logo` may carry theme-facing site identity data as `{ src, alt }`
- optional `site.newsletter` may carry theme-facing newsletter CTA/island data; ZeroPress does not implement provider submit behavior
- optional `site.comments` carries first-class ZeroPress or WordPress comment-provider configuration and requires both `enabled` and `api_base_url`
- optional `site.expose_generator` controls whether generated HTML exposes the ZeroPress generator meta tag
- optional closed `site.search`, `site.feed`, and `site.archive` objects carry required `enabled` feature requests; omission means requested enabled `true`
- `site.locale` is a canonical BCP 47 language tag
- `site.timezone` is `UTC`, a canonical IANA identifier, or a canonical fixed
  offset within `-14:00..+14:00`; zero offset is written as `UTC`
- fallback datetime formatting uses `site.date_style` and `site.time_style` Intl style presets
- canonical `*_at_iso` fields remain available for themes that progressively enhance explicitly marked `<time>` elements for the visitor's browser locale and timezone
- comment runtime availability requires `site.comments`; `site.comments.enabled` is the positive site-level request flag
- optional closed `site.robots` carries required `allow_indexing`; omission
  means `{ "allow_indexing": true }`
- enabled menus may be exported in optional root `menus`
- `menus` is keyed by stable `menu_id`
- menu items use `title`, `url`, `target`, optional scalar `meta`, and recursive `children`
- menu item `target` is `_self` or `_blank`
- menu items do not carry admin-only fields such as `reference_id`
- enabled widget areas may be exported in optional root `widgets`
- `widgets` is keyed by stable `widget_area_id`
- widget items intentionally fix only the common shell: `type`, `title`, and optional `settings`
- widget item `title` is a required string; empty and whitespace-only values are accepted and mean that no widget title should be displayed after consumer normalization
- widget-type-specific `settings` structure is not enforced by this validator in v0.7
- named page/post collections may be exported in optional root `collections`
- `collections` is keyed by stable collection ids and contains ordered Post
  `{ type: "post", slug }` or Page `{ type: "page", path }` references
- managed media metadata may be exported in optional `content.media[]`
- media registry items use `src`, positive integer `width`, positive integer `height`, and optional `alt`
- optional `custom_css` carries site-level stylesheet input as `{ content }`
- optional `custom_html` carries trusted site-level raw HTML strings as `{ head_end, body_end }`; at least one slot is required, each string must be non-blank and no longer than 65,536 Unicode code points, and validation preserves the supplied whitespace

### Comment provider contract

`site.comments` is optional. Its absence leaves the site and per-content policy
fields intact but means that no comment provider is available:

```json
{
  "site": {
    "comments": {
      "enabled": true,
      "api_base_url": "https://comments.example.com",
      "provider": "zeropress",
      "per_page": 50,
      "order": "desc",
      "threading": {
        "enabled": true,
        "max_depth": 2
      }
    }
  }
}
```

Both `enabled` and `api_base_url` are required. Missing optional values resolve in consumers as
`provider: "zeropress"`, `per_page: 50`, `order: "desc"`,
`threading.enabled: true`, and `threading.max_depth: 2`. Validation does not
insert or mutate these defaults. `per_page` is limited to `1..100`, and
`threading.max_depth` is limited to `2..10`.

`api_base_url` accepts an absolute HTTP(S) URL with a hostname or a same-host
root-relative path. Credentials, query strings, fragments, protocol-relative
URLs, unsafe whitespace/control characters, backslashes, and malformed percent
encoding are rejected.

Content items may retain ZeroPress request metadata regardless of the currently
effective provider or comment policy. It is optional except when
`site.comments.enabled` is `true`, the effective provider is ZeroPress
(explicit or default), and the item has `allow_comments: true`. Such an item
must carry:

```json
{
  "comments": {
    "request_token": "opaque-non-blank-token"
  }
}
```

`request_token` is opaque, non-blank, and limited to 512 Unicode code points.
Whenever the object is present, its structure and token are validated. Consumers
must ignore and omit it unless ZeroPress comments are effective for that content
item. Post and Page `allow_comments` default to `false`. A Page requires a
positive `public_id` when comments are explicitly enabled.

### Search, feed, and archive requests

`site.search`, `site.feed`, and `site.archive` are optional closed objects with
one required field when present:

```json
{
  "search": { "enabled": true },
  "feed": { "enabled": false },
  "archive": { "enabled": true }
}
```

Omission means requested enabled `true`. These are input preferences rather
than guarantees: Build Core combines each request with the relevant runtime
conditions, such as theme search capability, canonical site URL and feed build
settings, or the presence of `archive.html`.

### Page identity and references

Page leaf slugs are not globally unique. A Page's effective identity is its
NFC-normalized relative route path: explicit `page.path` when present, otherwise
the effective `site.permalinks.pages` pattern applied to `page.slug`. Effective
Page paths must be unique, while equal leaf slugs at different paths are valid.

The front-page contract is a strict union:

```json
{ "type": "theme_index" }
{ "type": "page", "page_path": "docs/about" }
{ "type": "standalone_html", "html": "<!doctype html>..." }
```

Page front-page and collection references must resolve to an effective Page
path in the same payload. Post collection references continue to resolve by
NFC-normalized Post slug. Branch-only fields may not be mixed.

Build tooling is responsible for resolving authors and deriving render-ready route data, including HTML conversion for non-HTML source content.

### Runtime semantic invariants

Some cross-record rules cannot be expressed precisely by JSON Schema and remain
part of the runtime contract:

- author ids, Post public IDs, Page public IDs, NFC-normalized Post slugs,
  NFC-normalized effective Page paths, and media `src` projections are unique
- post and page public-id namespaces remain independent; equal numeric values across the two content types are allowed
- every post `author_id` references an author in the same payload
- front-page and collection references resolve to content in the same payload
- RFC 3339 timestamps are checked for real calendar dates in addition to their
  schema `format` and structural pattern
- slug and literal route-segment length is measured after NFC normalization;
  the Schema records this runtime rule with ZeroPress extension annotations
  because standard JSON Schema cannot express normalization-aware length
- URL, RFC 3339, canonical BCP 47, canonical IANA/fixed-offset timezone, and
  normalization-aware uniqueness constraints are enforced by the runtime
  validator; JSON Schema `format` and ZeroPress annotations document them
- absolute Web URLs pass structural checks first, then WHATWG URL parsing
  validates credentials, host, port range, IP syntax, and unsafe path segments

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

### `canonicalizePreviewDataKeyOrder(data)`

Returns a new, recursively cloned value whose known object keys follow the v0.7
Schema property order. Named maps and open metadata/settings objects use lexical
key order, while array order is preserved. This presentation helper does not
validate, normalize, add, or remove Preview Data values.

## License

MIT
