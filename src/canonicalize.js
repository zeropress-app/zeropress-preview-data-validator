const order = (...keys) => Object.freeze(keys);

// Keep these arrays byte-for-byte aligned with the corresponding v0.7 JSON
// Schema `properties` objects. Tests compare every known closed record with the
// committed schema so presentation order cannot drift from the public contract.
export const PREVIEW_DATA_V07_KEY_ORDERS = Object.freeze({
  root: order(
    '$schema',
    'version',
    'generator',
    'generated_at',
    'site',
    'content',
    'menus',
    'widgets',
    'collections',
    'custom_css',
    'custom_html',
  ),
  permalinks: order('output_style', 'posts', 'pages', 'categories', 'tags'),
  frontPage: order('type', 'page_path', 'html'),
  postIndex: order('enabled', 'path', 'paginate'),
  site: order(
    'title',
    'description',
    'url',
    'media_origin',
    'media_delivery_mode',
    'favicon',
    'logo',
    'newsletter',
    'comments',
    'expose_generator',
    'search',
    'feed',
    'archive',
    'locale',
    'posts_per_page',
    'date_style',
    'time_style',
    'timezone',
    'robots',
    'permalinks',
    'front_page',
    'post_index',
    'footer',
    'meta',
  ),
  siteFavicon: order('icon', 'icon_dark', 'svg', 'png', 'apple_touch_icon'),
  siteLogo: order('src', 'alt'),
  siteNewsletter: order('enabled', 'title', 'description', 'button_label', 'signup_url', 'embed_url'),
  siteFeatureState: order('enabled'),
  siteRobots: order('allow_indexing'),
  siteComments: order('enabled', 'api_base_url', 'provider', 'per_page', 'order', 'threading'),
  siteCommentsThreading: order('enabled', 'max_depth'),
  contentComments: order('request_token'),
  siteFooter: order('copyright_text', 'attribution'),
  author: order('id', 'display_name', 'avatar'),
  media: order('src', 'width', 'height', 'alt'),
  post: order(
    'public_id',
    'title',
    'slug',
    'content',
    'document_type',
    'excerpt',
    'published_at_iso',
    'updated_at_iso',
    'author_id',
    'featured_image',
    'meta',
    'data',
    'status',
    'discoverability',
    'allow_comments',
    'comments',
    'category_slugs',
    'tag_slugs',
  ),
  page: order(
    'public_id',
    'title',
    'slug',
    'path',
    'content',
    'document_type',
    'excerpt',
    'featured_image',
    'updated_at_iso',
    'meta',
    'data',
    'status',
    'discoverability',
    'allow_comments',
    'comments',
  ),
  category: order('name', 'slug', 'description'),
  tag: order('name', 'slug', 'description'),
  menuItem: order('title', 'url', 'target', 'meta', 'children'),
  menu: order('name', 'items'),
  widgetItem: order('type', 'title', 'settings'),
  widgetArea: order('name', 'items'),
  collectionItem: order('type', 'slug', 'path'),
  collection: order('title', 'description', 'items'),
  customCss: order('content'),
  customHtml: order('head_end', 'body_end'),
  content: order('authors', 'posts', 'pages', 'categories', 'tags', 'media'),
});

const known = (name) => Object.freeze({ kind: 'known', name });
const arrayOf = (item) => Object.freeze({ kind: 'array', item });
const namedMapOf = (value) => Object.freeze({ kind: 'named-map', value });

const KNOWN_RECORD_CHILDREN = Object.freeze({
  root: Object.freeze({
    site: known('site'),
    content: known('content'),
    menus: namedMapOf(known('menu')),
    widgets: namedMapOf(known('widgetArea')),
    collections: namedMapOf(known('collection')),
    custom_css: known('customCss'),
    custom_html: known('customHtml'),
  }),
  site: Object.freeze({
    favicon: known('siteFavicon'),
    logo: known('siteLogo'),
    newsletter: known('siteNewsletter'),
    search: known('siteFeatureState'),
    feed: known('siteFeatureState'),
    archive: known('siteFeatureState'),
    robots: known('siteRobots'),
    comments: known('siteComments'),
    permalinks: known('permalinks'),
    front_page: known('frontPage'),
    post_index: known('postIndex'),
    footer: known('siteFooter'),
  }),
  siteComments: Object.freeze({
    threading: known('siteCommentsThreading'),
  }),
  content: Object.freeze({
    authors: arrayOf(known('author')),
    posts: arrayOf(known('post')),
    pages: arrayOf(known('page')),
    categories: arrayOf(known('category')),
    tags: arrayOf(known('tag')),
    media: arrayOf(known('media')),
  }),
  post: Object.freeze({
    comments: known('contentComments'),
  }),
  page: Object.freeze({
    comments: known('contentComments'),
  }),
  menu: Object.freeze({
    items: arrayOf(known('menuItem')),
  }),
  menuItem: Object.freeze({
    children: arrayOf(known('menuItem')),
  }),
  widgetArea: Object.freeze({
    items: arrayOf(known('widgetItem')),
  }),
  collection: Object.freeze({
    items: arrayOf(known('collectionItem')),
  }),
});

/**
 * Return a recursively cloned Preview Data value with deterministic object-key
 * insertion order. This is presentation canonicalization only: it does not
 * validate, normalize, add, or remove contract values.
 */
export function canonicalizePreviewDataKeyOrder(value) {
  return canonicalizeKnownRecord(value, 'root');
}

function canonicalizeKnownRecord(value, name) {
  if (!isPlainRecord(value)) {
    return canonicalizeOpenValue(value);
  }

  const keyOrder = PREVIEW_DATA_V07_KEY_ORDERS[name];
  const knownKeys = new Set(keyOrder);
  const children = KNOWN_RECORD_CHILDREN[name] ?? {};
  const entries = [];

  for (const key of keyOrder) {
    if (Object.hasOwn(value, key)) {
      entries.push([key, canonicalizeWithDescriptor(value[key], children[key])]);
    }
  }

  const unknownKeys = Object.keys(value)
    .filter((key) => !knownKeys.has(key))
    .sort(compareLexically);
  for (const key of unknownKeys) {
    entries.push([key, canonicalizeOpenValue(value[key])]);
  }

  return Object.fromEntries(entries);
}

function canonicalizeWithDescriptor(value, descriptor) {
  if (descriptor?.kind === 'known') {
    return canonicalizeKnownRecord(value, descriptor.name);
  }

  if (descriptor?.kind === 'array') {
    if (!Array.isArray(value)) {
      return canonicalizeOpenValue(value);
    }
    return value.map((entry) => canonicalizeWithDescriptor(entry, descriptor.item));
  }

  if (descriptor?.kind === 'named-map') {
    if (!isPlainRecord(value)) {
      return canonicalizeOpenValue(value);
    }
    return Object.fromEntries(
      Object.keys(value)
        .sort(compareLexically)
        .map((key) => [key, canonicalizeWithDescriptor(value[key], descriptor.value)]),
    );
  }

  return canonicalizeOpenValue(value);
}

function canonicalizeOpenValue(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => canonicalizeOpenValue(entry));
  }
  if (!isPlainRecord(value)) {
    return value;
  }

  return Object.fromEntries(
    Object.keys(value)
      .sort(compareLexically)
      .map((key) => [key, canonicalizeOpenValue(value[key])]),
  );
}

function compareLexically(left, right) {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function isPlainRecord(value) {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
