// Human-facing annotations are kept separate from executable constraints so
// contract changes cannot accidentally discard the published documentation.
export const SCHEMA_ANNOTATIONS = Object.freeze({
  'properties/$schema': ['Optional JSON Schema URI or path used by editors and tooling. ZeroPress core does not interpret this value.'],
  'properties/version': ['Preview-data contract version.'],
  'properties/generator': ['Identifier of the generator that produced this payload.'],
  'properties/generated_at': ['RFC 3339 timestamp with Z or a numeric UTC offset indicating when the payload was generated.'],
  '$defs/slugSegment': ['A slug segment containing only Unicode letters, combining marks, decimal digits, isolated internal periods, hyphen, and underscore, with at least one letter or digit. Periods may not lead, trail, or appear consecutively. Decomposed input is accepted; canonical results and length are evaluated after NFC normalization.'],
  '$defs/dateTime': ['RFC 3339 date-time. JSON Schema format and the structural pattern aid editors; runtime validation is authoritative for real calendar dates and offset ranges.'],
  '$defs/previewMeta': ['Generator-defined optional metadata for site/theme conventions. ZeroPress core does not interpret metadata keys.'],
  '$defs/structuredData': ['Page/post scoped structured data for theme-facing repeated UI blocks.'],
  '$defs/permalinks': ['Optional site permalink policy. Missing fields resolve to directory output, /posts/:slug/, /:slug/, /categories/:slug/, and /tags/:slug/ without mutating Preview Data.'],
  '$defs/permalinks/properties/output_style': [
    'Controls whether generated public URLs and output files use directory index paths or .html extension paths. Allowed values: directory, html-extension.',
    'Controls whether generated public URLs and output files use directory index paths or `.html` extension paths. Allowed values: `directory`, `html-extension`.',
  ],
  '$defs/permalinkPattern': [
    'Absolute URL path pattern beginning with /. Tokens must occupy full path segments, such as :slug or :public_id. Query strings, fragments, percent-encoding, and literal .html suffixes are not allowed. Allowed tokens depend on the permalink field.',
    'Absolute URL path pattern beginning with `/`. Tokens must occupy full path segments, such as `:slug` or `:public_id`. Query strings, fragments, percent-encoding, and literal `.html` suffixes are not allowed. Allowed tokens depend on the permalink field.',
  ],
  '$defs/frontPage': ['Optional root front page selection policy expressed as a closed discriminated union. Missing means theme_index.'],
  '$defs/frontPage/properties/type': ['Front page source type.'],
  '$defs/frontPage/properties/page_path': ['Effective relative Page route path used when type is page.', 'Effective relative Page route path used when `type` is `page`.'],
  '$defs/frontPage/properties/html': ['Trusted full HTML used when type is standalone_html.', 'Trusted full HTML used when `type` is `standalone_html`.'],
  '$defs/postIndex': ['Optional post index generation policy. Missing fields use Build Core defaults: enabled true, path /, and paginate true.'],
  '$defs/postIndex/properties/enabled': ['Whether the site requests a post index route.'],
  '$defs/postIndex/properties/paginate': ['Whether the post index should generate page 2+ routes.'],
  '$defs/postIndexPath': ['Absolute public path for the post index route. Use / for the site root.', 'Absolute public path for the post index route. Use `/` for the site root.'],
  '$defs/pagePath': ['Effective relative Page route path. It has no leading or trailing slash, each segment follows the slug policy, and identity is compared after NFC normalization.'],
  '$defs/absoluteWebUrl': ['Credential-free absolute HTTP(S) URL. Query strings and fragments are allowed; unsafe characters, malformed percent encoding, and dot path segments are rejected by runtime validation.'],
  '$defs/siteOrigin': ['Empty string or an HTTP(S) origin without credentials, path, query, or fragment. A trailing root slash is accepted; canonical producers emit URL.origin.'],
  '$defs/mediaOrigin': ['Empty string or an HTTP(S) origin without credentials, path, query, or fragment. A trailing root slash is accepted; canonical producers omit it.'],
  '$defs/navigationUrl': ['Credential-free absolute HTTP(S) URL or safe single-slash root-relative URL. The root path / is allowed. Bare and dot-relative paths are rejected.'],
  '$defs/mediaUrl': ['Credential-free absolute HTTP(S) URL or safe single-slash root-relative media URL with a non-root path. Bare and dot-relative paths are rejected.'],
  '$defs/site/properties/url': ['Required canonical site origin. Use an empty string when the public origin is unknown.'],
  '$defs/site/properties/media_origin': [
    'Required media origin used to resolve relative media URLs. Use an empty string to preserve relative values. Non-empty values must be an HTTP(S) origin with an optional port and without credentials, path, query, or fragment. A trailing root slash is accepted, while canonical payloads omit it.',
    'Required media origin used to resolve relative media URLs. Use an empty string to preserve relative values. Non-empty values must be an HTTP(S) origin with an optional port and without credentials, path, query, or fragment. A trailing root slash is accepted, while canonical payloads omit it.',
  ],
  '$defs/site/properties/media_delivery_mode': [
    'Optional media delivery capability. Missing means none. media_domain requires a non-empty site.media_origin and means media URLs under that origin support ZeroPress image variant query parameters.',
    'Optional media delivery capability. Missing means `none`. `media_domain` requires a non-empty `site.media_origin` and means media URLs under that origin support ZeroPress image variant query parameters.',
    'none',
  ],
  '$defs/site/properties/comments': [
    'Optional comment-provider configuration and site-level requested state. When omitted, the comment runtime is unavailable.',
    'Optional comment-provider configuration and site-level requested state. When omitted, the comment runtime is unavailable.',
  ],
  '$defs/site/properties/expose_generator': [
    'Whether generated HTML pages should include the ZeroPress generator meta tag. Missing or true exposes the generator; false omits it.',
    'Whether generated HTML pages should include `<meta name="generator" content="ZeroPress">`. Missing or `true` exposes the generator; `false` omits it.',
    true,
  ],
  '$defs/site/properties/search': [
    'Site-level requested state for native static search. Missing means enabled; Build Core combines the request with theme capability.',
    'Site-level requested state for native static search. Missing means enabled; Build Core combines the request with theme capability.',
    { enabled: true },
  ],
  '$defs/site/properties/feed': [
    'Site-level requested state for RSS feed generation. Missing means enabled; Build Core also requires a canonical site URL and feed generation to be enabled.',
    'Site-level requested state for RSS feed generation. Missing means enabled; Build Core also requires a canonical `site.url` and feed generation to be enabled.',
    { enabled: true },
  ],
  '$defs/site/properties/archive': [
    'Site-level requested state for chronological archive generation. Missing means enabled; Build Core also requires an archive template.',
    'Site-level requested state for chronological archive generation. Missing means enabled; Build Core also requires `archive.html`.',
    { enabled: true },
  ],
  '$defs/site/properties/date_style': [
    'Date style preset based on Intl.DateTimeFormat dateStyle. Use none to omit the date portion.',
    'Date style preset based on `Intl.DateTimeFormat` `dateStyle`. Use `none` to omit the date portion.',
  ],
  '$defs/site/properties/time_style': [
    'Time style preset based on Intl.DateTimeFormat timeStyle. Use none to omit the time portion.',
    'Time style preset based on `Intl.DateTimeFormat` `timeStyle`. Use `none` to omit the time portion.',
  ],
  '$defs/site/properties/robots': [
    'Optional robots policy. Missing means allow_indexing true.',
    'Optional robots policy. Missing means `allow_indexing: true`.',
    { allow_indexing: true },
  ],
  '$defs/siteRobots': ['Closed site robots policy used by Build Core and exposed to themes.'],
  '$defs/siteRobots/properties/allow_indexing': ['Whether generated fallback robots.txt permits indexing.'],
  '$defs/locale': ['Canonical BCP 47 locale. JSON Schema provides structural guidance; runtime validation is authoritative.'],
  '$defs/timezone': ['UTC, a canonical IANA time-zone identifier, or a canonical fixed offset within ±14:00. Zero offset is represented as UTC. Runtime validation is authoritative.'],
  '$defs/siteFavicon': ['Optional site favicon links for HTML head output.', 'Optional site favicon links for HTML `<head>` output.'],
  '$defs/siteFavicon/properties/icon': ['ICO or generic favicon URL/path.'],
  '$defs/siteFavicon/properties/icon_dark': ['Dark color-scheme ICO or generic favicon URL/path.'],
  '$defs/siteFavicon/properties/svg': ['SVG favicon URL/path.'],
  '$defs/siteFavicon/properties/png': ['PNG favicon URL/path.'],
  '$defs/siteFavicon/properties/apple_touch_icon': ['Apple touch icon URL/path.'],
  '$defs/siteLogo': ['Optional site logo data for theme rendering.'],
  '$defs/siteLogo/properties/src': ['Logo URL for theme rendering. Use a safe single-slash root-relative media path or a credential-free HTTP(S) URL with a path. Bare and dot-relative paths are not supported.'],
  '$defs/siteLogo/properties/alt': ['Optional logo alternative text. Themes may fall back to site.title when omitted.', 'Optional logo alternative text. Themes may fall back to `site.title` when omitted.'],
  '$defs/siteNewsletter': ['Optional newsletter CTA/island data for theme rendering. ZeroPress does not implement provider submit behavior.'],
  '$defs/siteNewsletter/properties/enabled': [
    'Whether themes should show the newsletter CTA or island.',
    'Whether themes should show the newsletter CTA or island.',
  ],
  '$defs/siteNewsletter/properties/title': ['Optional theme-facing newsletter title. Themes own fallback copy.'],
  '$defs/siteNewsletter/properties/description': ['Optional theme-facing newsletter description. Themes own fallback copy.'],
  '$defs/siteNewsletter/properties/button_label': ['Optional theme-facing CTA label. Themes own fallback copy.'],
  '$defs/siteNewsletter/properties/signup_url': ['Optional external signup URL or same-host root-relative signup path.'],
  '$defs/siteNewsletter/properties/embed_url': ['Optional iframe embed URL or same-host root-relative embed path.'],
  '$defs/commentsApiBaseUrl': [
    'An absolute http(s) URL with a hostname or a same-host root-relative path. Credentials, query strings, fragments, protocol-relative URLs, unsafe characters, and malformed percent encoding are not allowed.',
    'An absolute `http(s)` URL with a hostname or a same-host root-relative path. Credentials, query strings, fragments, protocol-relative URLs, unsafe characters, and malformed percent encoding are not allowed.',
  ],
  '$defs/siteComments': [
    'Optional site-level comment-provider configuration and requested state. Consumer defaults are applied without mutating preview-data.',
  ],
  '$defs/siteFeatureState': [
    'Closed requested-state object used by optional site search, feed, and archive controls.',
  ],
  '$defs/siteFeatureState/properties/enabled': [
    'Whether the site requests this feature. This field is required whenever the containing feature object exists.',
  ],
  '$defs/siteComments/properties/enabled': [
    'Whether the site requests comments when the configured provider and active theme make the runtime available.',
  ],
  '$defs/siteComments/properties/api_base_url': [
    'Comment service base URL or same-host root-relative path. Provider-specific consumers derive content endpoints from this value.',
  ],
  '$defs/siteComments/properties/provider': [
    'Comment API provider. Missing means zeropress.',
    'Comment API provider. Missing means `zeropress`.',
    'zeropress',
  ],
  '$defs/siteComments/properties/per_page': [
    'Preferred comment page size from 1 through 100. Missing means 50.',
    'Preferred comment page size from `1` through `100`. Missing means `50`.',
    50,
  ],
  '$defs/siteComments/properties/order': [
    'Preferred comment order. Missing means desc.',
    'Preferred comment order. Missing means `desc`.',
    'desc',
  ],
  '$defs/siteComments/properties/threading': [
    'Optional threaded-comment display policy.',
  ],
  '$defs/siteCommentsThreading': [
    'Threaded-comment display policy resolved by consumers.',
  ],
  '$defs/siteCommentsThreading/properties/enabled': [
    'Whether threaded comment display is enabled. Missing means true.',
    'Whether threaded comment display is enabled. Missing means `true`.',
    true,
  ],
  '$defs/siteCommentsThreading/properties/max_depth': [
    'Maximum threaded comment display depth from 2 through 10. Missing means 2.',
    'Maximum threaded comment display depth from `2` through `10`. Missing means `2`.',
    2,
  ],
  '$defs/contentComments': [
    'ZeroPress request metadata for a content item. This object is required when ZeroPress comments are effective for that item; otherwise it is optional and ignored.',
  ],
  '$defs/contentComments/properties/request_token': [
    'Opaque non-blank request token, up to 512 Unicode code points, used by the ZeroPress provider to authorize comment API requests for this content item.',
    'Opaque non-blank request token, up to `512` Unicode code points, used by the ZeroPress provider to authorize comment API requests for this content item.',
  ],
  '$defs/siteFooter': ['Optional site footer display data for themes.'],
  '$defs/siteFooter/properties/copyright_text': ['Theme-facing footer copyright or legal text. ZeroPress does not add a copyright symbol automatically.'],
  '$defs/siteFooter/properties/attribution': [
    'When false, themes that support ZeroPress attribution should hide it. Missing or true means attribution may be shown.',
    'When `false`, themes that support ZeroPress attribution should hide it. Missing or `true` means attribution may be shown.',
  ],
  '$defs/media/properties/src': [
    'Managed media source URL or path. Matches existing media fields such as featured_image or avatar after renderer normalization.',
    'Managed media source URL or path. Matches existing media fields such as `featured_image` or `avatar` after renderer normalization.',
  ],
  '$defs/post/properties/discoverability': [
    'Optional document discoverability policy. default leaves generated discovery outputs unchanged; noindex adds HTML robots noindex; delist removes the document from automatic discovery outputs while still rendering its route.',
    'Optional document discoverability policy. `default` leaves generated discovery outputs unchanged; `noindex` adds HTML robots `noindex`; `delist` removes the document from automatic discovery outputs while still rendering its route.',
  ],
  '$defs/post/properties/slug': ['Post route identity. Values must be unique after NFC normalization within content.posts.'],
  '$defs/post/properties/allow_comments': [
    'Optional per-post comment policy. Missing means false.',
    'Optional per-post comment policy. Missing means `false`.',
    false,
  ],
  '$defs/post/properties/comments': [
    'ZeroPress request metadata for this post. Required when ZeroPress comments are effective for the post; otherwise optional and ignored.',
  ],
  '$defs/post/properties/tag_slugs': [
    'Ordered tag slug references for this post, unique after NFC normalization. Array order is the theme-facing display order; the first entry is display-first and does not imply a primary or SEO tag.',
    'Ordered tag slug references for this post, unique after NFC normalization. Array order is the theme-facing display order; the first entry is display-first and does not imply a primary or SEO tag.',
  ],
  '$defs/content/properties/tags': [
    'Global tag definitions. Array order has no semantic meaning; producers should emit a stable ascending order by name and then slug.',
    'Global tag definitions. Array order has no semantic meaning; producers should emit a stable ascending order by `name` and then `slug`.',
  ],
  '$defs/page/properties/public_id': [
    'Optional positive public identifier used by comment providers. Required when page.allow_comments is true.',
    'Optional positive public identifier used by comment providers. Required when `page.allow_comments` is `true`.',
  ],
  '$defs/page/properties/slug': ['Page leaf slug. Leaf slugs may repeat when their effective Page paths are distinct.'],
  '$defs/page/properties/path': ['Optional explicit effective Page route path. When omitted, consumers apply the effective pages permalink to the Page slug.'],
  '$defs/page/properties/allow_comments': [
    'Optional per-page comment policy. Missing means false.',
    'Optional per-page comment policy. Missing means `false`.',
    false,
  ],
  '$defs/page/properties/comments': [
    'ZeroPress request metadata for this page. Required when ZeroPress comments are effective for the page; otherwise optional and ignored.',
  ],
  '$defs/page/properties/updated_at_iso': ['Optional machine-readable page update timestamp.'],
  '$defs/page/properties/discoverability': [
    'Optional document discoverability policy. default leaves generated discovery outputs unchanged; noindex adds HTML robots noindex; delist removes the document from automatic discovery outputs while still rendering its route.',
    'Optional document discoverability policy. `default` leaves generated discovery outputs unchanged; `noindex` adds HTML robots `noindex`; `delist` removes the document from automatic discovery outputs while still rendering its route.',
  ],
  '$defs/menuItem': ['Theme-facing navigation item. Children may be nested to any depth.', 'Theme-facing navigation item. `children` may be nested to any depth.'],
  '$defs/menuItem/properties/title': ['Display title shown by the theme.'],
  '$defs/menuItem/properties/url': ['Resolved absolute http(s) URL or safe relative web path.', 'Resolved absolute `http(s)` URL or safe relative web path.'],
  '$defs/menuItem/properties/target': ['Link target semantics for the theme.'],
  '$defs/menuItem/properties/meta': ['Optional scalar display metadata such as icon, badge, or accent.', 'Optional scalar display metadata such as `icon`, `badge`, or `accent`.'],
  '$defs/menuItem/properties/children': ['Nested child menu items.'],
  '$defs/menu': ['A named enabled menu exported to themes under its menu_id key.', 'A named enabled menu exported to themes under its `menu_id` key.'],
  '$defs/menu/properties/name': ['Human-readable menu name for development and diagnostics.'],
  '$defs/menu/properties/items': ['Resolved menu tree after omission of missing references.'],
  '$defs/widgetItem': ['Theme-facing widget item shell. Widget-type-specific settings are intentionally left open.', 'Theme-facing widget item shell. Widget-type-specific `settings` are intentionally left open.'],
  '$defs/widgetItem/properties/type': ['Stable widget item type identifier.'],
  '$defs/widgetItem/properties/title': ['Required display title string. An empty or whitespace-only value means the widget has no display title after normalization.'],
  '$defs/widgetItem/properties/settings': ['Widget-type-specific settings payload. This object is intentionally schema-light.', 'Widget-type-specific settings payload. This object is intentionally schema-light.'],
  '$defs/widgetArea': ['A named enabled widget area exported to themes under its widget_area_id key.', 'A named enabled widget area exported to themes under its `widget_area_id` key.'],
  '$defs/widgetArea/properties/name': ['Human-readable widget area name for development and diagnostics.'],
  '$defs/widgetArea/properties/items': ['Resolved widget item list after omission of disabled or missing-reference items.'],
  '$defs/widgets': ['Enabled widget areas keyed by widget_area_id. Disabled widget areas are omitted.', 'Enabled widget areas keyed by `widget_area_id`. Disabled widget areas are omitted.', {}],
  '$defs/widgets/propertyNames': ['Stable external widget area identifier.', 'Stable external `widget_area_id` identifier.'],
  '$defs/collectionItem': ['A reference to a page or post included in a named collection.'],
  '$defs/collectionItem/properties/type': ['Referenced content type.'],
  '$defs/collectionItem/properties/slug': ['Post slug used only when type is post.', 'Post slug used only when `type` is `post`.'],
  '$defs/collectionItem/properties/path': ['Effective Page route path used only when type is page.', 'Effective Page route path used only when `type` is `page`.'],
  '$defs/collection': ['A named curated content list exported to themes under its collection id.'],
  '$defs/collection/properties/title': ['Optional display title for the collection.'],
  '$defs/collection/properties/description': ['Optional helper text for the collection.'],
  '$defs/collections': ['Named curated content lists keyed by collection id.', undefined, {}],
  '$defs/collections/propertyNames': ['Stable collection identifier.'],
  '$defs/customCss': ['Optional site-level custom stylesheet input.'],
  '$defs/customCss/properties/content': ['Raw CSS source to be consumed by build tooling.'],
  '$defs/customHtml': ['Optional trusted site-level HTML injection slots.', 'Optional trusted site-level HTML injection slots. ZeroPress does not sanitize or interpret the HTML content.'],
  '$defs/customHtml/properties/head_end': [
    'Trusted raw HTML inserted before the closing head tag. The string must be non-blank and may contain up to 65,536 Unicode code points.',
    'Trusted raw HTML inserted before the closing `</head>` tag. The string must be non-blank and may contain up to `65,536` Unicode code points.',
  ],
  '$defs/customHtml/properties/body_end': [
    'Trusted raw HTML inserted before the closing body tag. The string must be non-blank and may contain up to 65,536 Unicode code points.',
    'Trusted raw HTML inserted before the closing `</body>` tag. The string must be non-blank and may contain up to `65,536` Unicode code points.',
  ],
  '$defs/menus': ['Enabled menus keyed by menu_id. Disabled menus and absent menu_ids are omitted.', 'Enabled menus keyed by `menu_id`. Disabled menus and absent `menu_id`s are omitted.', {}],
  '$defs/menus/propertyNames': ['Stable external menu identifier.', 'Stable external `menu_id` identifier.'],
});

export function applySchemaAnnotations(schema) {
  for (const [pointer, [description, markdownDescription = description, defaultValue]] of Object.entries(SCHEMA_ANNOTATIONS)) {
    const target = pointer.split('/').reduce((value, key) => value?.[key], schema);
    if (!target) {
      throw new Error(`Schema annotation target does not exist: ${pointer}`);
    }
    target.description = description;
    target.markdownDescription = markdownDescription;
    if (defaultValue !== undefined) {
      target.default = defaultValue;
    }
  }
  return schema;
}
