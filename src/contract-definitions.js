import {
  CONTENT_SLUG_COMPONENT_PATTERN_SOURCE,
  CONTENT_SLUG_MAX_LENGTH,
  CONTENT_SLUG_PATTERN_SOURCE,
} from '@zeropress/slug-policy';
import { applySchemaAnnotations } from './schema-annotations.js';

export const PREVIEW_DATA_VERSION = '0.7';

export const PREVIEW_DOCUMENT_TYPES = Object.freeze(['plaintext', 'markdown', 'html']);
export const PREVIEW_MENU_TARGETS = Object.freeze(['_self', '_blank']);
export const PREVIEW_COLLECTION_ITEM_TYPES = Object.freeze(['post', 'page']);
export const PREVIEW_MEDIA_DELIVERY_MODES = Object.freeze(['none', 'media_domain']);
export const PREVIEW_DATETIME_STYLES = Object.freeze(['none', 'short', 'medium', 'long', 'full']);
export const PREVIEW_DISCOVERABILITY_VALUES = Object.freeze(['default', 'noindex', 'delist']);
export const PREVIEW_PERMALINK_OUTPUT_STYLES = Object.freeze(['directory', 'html-extension']);
export const PREVIEW_PERMALINK_FIELDS = Object.freeze(['posts', 'pages', 'categories', 'tags']);
export const PREVIEW_FRONT_PAGE_TYPES = Object.freeze(['theme_index', 'page', 'standalone_html']);
export const PREVIEW_COMMENTS_PROVIDERS = Object.freeze(['zeropress', 'wordpress']);
export const PREVIEW_COMMENTS_ORDERS = Object.freeze(['asc', 'desc']);
export const PREVIEW_COMMENT_REQUEST_TOKEN_MAX_LENGTH = 512;
export const PREVIEW_CUSTOM_HTML_SLOT_MAX_LENGTH = 65_536;

export const PREVIEW_MENU_ID_PATTERN_SOURCE = '^[a-z][a-z0-9_-]{0,63}$';
export const PREVIEW_WIDGET_AREA_ID_PATTERN_SOURCE = '^[a-z][a-z0-9_-]{0,63}$';
export const PREVIEW_COLLECTION_ID_PATTERN_SOURCE = '^[a-z][a-z0-9_-]{0,63}$';
export const PREVIEW_DATA_KEY_PATTERN_SOURCE = '^[a-zA-Z_][a-zA-Z0-9_]*(?:-[a-zA-Z0-9_]+)*$';
export const PREVIEW_MENU_ID_PATTERN = new RegExp(PREVIEW_MENU_ID_PATTERN_SOURCE);
export const PREVIEW_WIDGET_AREA_ID_PATTERN = new RegExp(PREVIEW_WIDGET_AREA_ID_PATTERN_SOURCE);
export const PREVIEW_COLLECTION_ID_PATTERN = new RegExp(PREVIEW_COLLECTION_ID_PATTERN_SOURCE);
export const PREVIEW_DATA_KEY_PATTERN = new RegExp(PREVIEW_DATA_KEY_PATTERN_SOURCE);

export const PREVIEW_DATA_MAX_DEPTH = 4;
export const PREVIEW_DATA_MAX_KEYS = 64;
export const PREVIEW_DATA_MAX_ARRAY_LENGTH = 256;

export const PREVIEW_PERMALINK_TOKENS = Object.freeze({
  posts: new Set(['slug', 'public_id', 'year', 'month', 'day']),
  pages: new Set(['slug']),
  categories: new Set(['slug']),
  tags: new Set(['slug']),
});

export const RFC3339_PATTERN_SOURCE = String.raw`^(\d{4})-(\d{2})-(\d{2})[Tt](\d{2}):(\d{2}):(\d{2})(\.\d+)?([Zz]|([+-])(\d{2}):(\d{2}))$`;
export const RFC3339_PATTERN = new RegExp(RFC3339_PATTERN_SOURCE);

function contract(required, optional = []) {
  return Object.freeze({
    required: Object.freeze([...required]),
    optional: Object.freeze([...optional]),
    allowed: Object.freeze([...required, ...optional]),
  });
}

export const OBJECT_CONTRACTS = Object.freeze({
  root: contract(
    ['version', 'generator', 'generated_at', 'site', 'content'],
    ['$schema', 'menus', 'widgets', 'collections', 'custom_css', 'custom_html'],
  ),
  site: contract(
    ['title', 'description', 'url', 'media_origin', 'locale', 'posts_per_page', 'date_style', 'time_style', 'timezone'],
    ['media_delivery_mode', 'favicon', 'logo', 'newsletter', 'comments', 'expose_generator', 'search', 'feed', 'archive', 'robots', 'permalinks', 'front_page', 'post_index', 'footer', 'meta'],
  ),
  content: contract(['authors', 'posts', 'pages', 'categories', 'tags'], ['media']),
  siteFooter: contract([], ['copyright_text', 'attribution']),
  menu: contract(['name', 'items']),
  menuItem: contract(['title', 'url', 'target', 'children'], ['meta']),
  collection: contract(['items'], ['title', 'description']),
  collectionItem: contract(['type'], ['slug', 'path']),
  widgetArea: contract(['name', 'items']),
  widgetItem: contract(['type', 'title'], ['settings']),
  customCss: contract(['content']),
  customHtml: contract([], ['head_end', 'body_end']),
  author: contract(['id', 'display_name'], ['avatar']),
  siteFavicon: contract([], ['icon', 'icon_dark', 'svg', 'png', 'apple_touch_icon']),
  siteLogo: contract(['src'], ['alt']),
  siteNewsletter: contract(['enabled'], ['title', 'description', 'button_label', 'signup_url', 'embed_url']),
  siteFeatureState: contract(['enabled']),
  siteRobots: contract(['allow_indexing']),
  siteComments: contract(['enabled', 'api_base_url'], ['provider', 'per_page', 'order', 'threading']),
  siteCommentsThreading: contract([], ['enabled', 'max_depth']),
  contentComments: contract(['request_token']),
  media: contract(['src', 'width', 'height'], ['alt']),
  post: contract(
    ['public_id', 'title', 'slug', 'content', 'document_type', 'excerpt', 'published_at_iso', 'updated_at_iso', 'author_id', 'status', 'category_slugs', 'tag_slugs'],
    ['featured_image', 'meta', 'data', 'discoverability', 'allow_comments', 'comments'],
  ),
  page: contract(
    ['title', 'slug', 'content', 'document_type', 'status'],
    ['public_id', 'path', 'excerpt', 'featured_image', 'updated_at_iso', 'meta', 'data', 'discoverability', 'allow_comments', 'comments'],
  ),
  permalinks: contract([], ['output_style', ...PREVIEW_PERMALINK_FIELDS]),
  frontPage: contract(['type'], ['page_path', 'html']),
  postIndex: contract([], ['enabled', 'path', 'paginate']),
  category: contract(['name', 'slug'], ['description']),
  tag: contract(['name', 'slug'], ['description']),
});

const NON_BLANK_PATTERN_SOURCE = String.raw`\S`;
const SAFE_PERCENT_ENCODING_PATTERN_SOURCE = String.raw`(?!.*%(?![0-9A-Fa-f]{2}))`;
const SAFE_URL_CHARACTERS_PATTERN_SOURCE = String.raw`(?!.*[\s\\\p{Cc}])`;
const HTTP_SCHEME_PATTERN_SOURCE = String.raw`[Hh][Tt][Tt][Pp][Ss]?`;
const WEB_ORIGIN_HOST_PATTERN_SOURCE = String.raw`(?:\[[0-9A-Fa-f:.]+\]|[^/?#:@]+)(?::[0-9]+)?`;
const DOT_PATH_SEGMENT_GUARD_PATTERN_SOURCE = String.raw`(?![^?#]*\/\.{1,2}(?:\/|[?#]|$))`;
export const ABSOLUTE_WEB_URL_PATTERN_SOURCE = String.raw`^${HTTP_SCHEME_PATTERN_SOURCE}://${SAFE_PERCENT_ENCODING_PATTERN_SOURCE}${SAFE_URL_CHARACTERS_PATTERN_SOURCE}${DOT_PATH_SEGMENT_GUARD_PATTERN_SOURCE}${WEB_ORIGIN_HOST_PATTERN_SOURCE}(?:[/?#].*)?$`;
export const ABSOLUTE_WEB_URL_PATTERN = new RegExp(ABSOLUTE_WEB_URL_PATTERN_SOURCE, 'u');
export const MEDIA_ORIGIN_PATTERN_SOURCE = String.raw`^${HTTP_SCHEME_PATTERN_SOURCE}://${SAFE_PERCENT_ENCODING_PATTERN_SOURCE}${SAFE_URL_CHARACTERS_PATTERN_SOURCE}${WEB_ORIGIN_HOST_PATTERN_SOURCE}/?$`;
export const MEDIA_ORIGIN_PATTERN = new RegExp(MEDIA_ORIGIN_PATTERN_SOURCE, 'u');
export const NAVIGATION_RELATIVE_URL_PATTERN_SOURCE = String.raw`^/(?!/)${SAFE_PERCENT_ENCODING_PATTERN_SOURCE}${SAFE_URL_CHARACTERS_PATTERN_SOURCE}${DOT_PATH_SEGMENT_GUARD_PATTERN_SOURCE}.*$`;
export const NAVIGATION_RELATIVE_URL_PATTERN = new RegExp(NAVIGATION_RELATIVE_URL_PATTERN_SOURCE, 'u');
export const MEDIA_RELATIVE_URL_PATTERN_SOURCE = String.raw`^/(?!/)(?=[^?#]*[^/?#])${SAFE_PERCENT_ENCODING_PATTERN_SOURCE}${SAFE_URL_CHARACTERS_PATTERN_SOURCE}${DOT_PATH_SEGMENT_GUARD_PATTERN_SOURCE}.*$`;
export const MEDIA_RELATIVE_URL_PATTERN = new RegExp(MEDIA_RELATIVE_URL_PATTERN_SOURCE, 'u');
const ABSOLUTE_MEDIA_PATH_PATTERN_SOURCE = String.raw`^${HTTP_SCHEME_PATTERN_SOURCE}://[^/?#]+/(?=[^?#]*[^/?#])`;
const COMMENTS_API_CREDENTIALS_PATTERN_SOURCE = String.raw`^${HTTP_SCHEME_PATTERN_SOURCE}://[^/?#]*@`;
export const COMMENTS_API_RELATIVE_URL_PATTERN_SOURCE = String.raw`^/(?!/)${SAFE_PERCENT_ENCODING_PATTERN_SOURCE}${SAFE_URL_CHARACTERS_PATTERN_SOURCE}${DOT_PATH_SEGMENT_GUARD_PATTERN_SOURCE}(?!.*[?#]).*$`;
export const COMMENTS_API_RELATIVE_URL_PATTERN = new RegExp(COMMENTS_API_RELATIVE_URL_PATTERN_SOURCE, 'u');

function ref(name, extra = {}) {
  return { $ref: `#/$defs/${name}`, ...extra };
}

function string(extra = {}) {
  return { type: 'string', ...extra };
}

function nonBlankString(extra = {}) {
  return { type: 'string', minLength: 1, pattern: NON_BLANK_PATTERN_SOURCE, ...extra };
}

function enumString(values, extra = {}) {
  return { type: 'string', enum: [...values], ...extra };
}

function closedObject(name, properties, extra = {}) {
  const definition = OBJECT_CONTRACTS[name];
  if (!definition) {
    throw new Error(`Unknown object contract: ${name}`);
  }
  const schema = {
    type: 'object',
    additionalProperties: false,
    ...extra,
    properties,
  };
  if (definition.required.length > 0) {
    schema.required = [...definition.required];
  }
  return schema;
}

function webUrlSchema() {
  return {
    type: 'string',
    format: 'uri',
    pattern: ABSOLUTE_WEB_URL_PATTERN_SOURCE,
  };
}

function siteOriginSchema() {
  return {
    anyOf: [
      { const: '' },
      {
        type: 'string',
        format: 'uri',
        pattern: MEDIA_ORIGIN_PATTERN_SOURCE,
      },
    ],
  };
}

function mediaOriginSchema() {
  return {
    anyOf: [
      { const: '' },
      {
        type: 'string',
        format: 'uri',
        pattern: MEDIA_ORIGIN_PATTERN_SOURCE,
      },
    ],
  };
}

function navigationUrlSchema() {
  return {
    anyOf: [
      ref('absoluteWebUrl'),
      { type: 'string', pattern: NAVIGATION_RELATIVE_URL_PATTERN_SOURCE },
    ],
  };
}

function mediaUrlSchema() {
  return {
    anyOf: [
      {
        allOf: [
          ref('absoluteWebUrl'),
          { pattern: ABSOLUTE_MEDIA_PATH_PATTERN_SOURCE },
        ],
      },
      { type: 'string', pattern: MEDIA_RELATIVE_URL_PATTERN_SOURCE },
    ],
  };
}

function commentsApiBaseUrlSchema() {
  return {
    anyOf: [
      {
        allOf: [
          ref('absoluteWebUrl'),
          {
            not: {
              anyOf: [
                { pattern: COMMENTS_API_CREDENTIALS_PATTERN_SOURCE },
                { pattern: '[?#]' },
              ],
            },
          },
        ],
      },
      { type: 'string', pattern: COMMENTS_API_RELATIVE_URL_PATTERN_SOURCE },
    ],
  };
}

function contentCommentPolicySchema() {
  return {
    if: {
      properties: {
        site: {
          type: 'object',
          properties: {
            comments: {
              type: 'object',
              properties: { enabled: { const: true } },
              required: ['enabled'],
              anyOf: [
                { not: { required: ['provider'] } },
                {
                  properties: { provider: { const: 'zeropress' } },
                  required: ['provider'],
                },
              ],
            },
          },
          required: ['comments'],
        },
      },
      required: ['site'],
    },
    then: { properties: { content: ref('contentWithZeroPressCommentsPolicy') } },
  };
}

const NFC_SEGMENT_LENGTH_ANNOTATION = Object.freeze({
  'x-zeropress-nfc-max-code-points': CONTENT_SLUG_MAX_LENGTH,
});

const NFC_LITERAL_SEGMENT_LENGTH_ANNOTATION = Object.freeze({
  'x-zeropress-literal-segment-nfc-max-code-points': CONTENT_SLUG_MAX_LENGTH,
});

const LITERAL_HTML_SEGMENT_GUARD_PATTERN_SOURCE = String.raw`(?!.*\.html(?:/|$))`;

function permalinkPatternSchema(tokens, requiredTokenPattern) {
  const tokenPattern = tokens.map((token) => `:${token}`).join('|');
  const segmentPattern = `(?:${CONTENT_SLUG_COMPONENT_PATTERN_SOURCE}|${tokenPattern})`;
  return string({
    pattern: `^${LITERAL_HTML_SEGMENT_GUARD_PATTERN_SOURCE}(?=.*(?:/${requiredTokenPattern})(?:/|$))/${segmentPattern}(?:/${segmentPattern})*/?$`,
    ...NFC_LITERAL_SEGMENT_LENGTH_ANNOTATION,
  });
}

function structuredDataDefinitions() {
  const definitions = {
    structuredData: {
      type: 'object',
      maxProperties: PREVIEW_DATA_MAX_KEYS,
      propertyNames: ref('structuredDataKey'),
      additionalProperties: ref('structuredDataValue1'),
    },
    structuredDataKey: string({ pattern: PREVIEW_DATA_KEY_PATTERN_SOURCE }),
    structuredDataScalar: { type: ['string', 'number', 'boolean', 'null'] },
  };

  for (let depth = 1; depth <= PREVIEW_DATA_MAX_DEPTH; depth += 1) {
    const nextValue = depth === PREVIEW_DATA_MAX_DEPTH ? 'structuredDataScalar' : `structuredDataValue${depth + 1}`;
    definitions[`structuredDataObject${depth}`] = {
      type: 'object',
      maxProperties: PREVIEW_DATA_MAX_KEYS,
      propertyNames: ref('structuredDataKey'),
      additionalProperties: ref(nextValue),
    };
    definitions[`structuredDataArray${depth}`] = {
      type: 'array',
      maxItems: PREVIEW_DATA_MAX_ARRAY_LENGTH,
      items: ref(nextValue),
    };
    definitions[`structuredDataValue${depth}`] = {
      anyOf: [
        ref('structuredDataScalar'),
        ref(`structuredDataObject${depth}`),
        ref(`structuredDataArray${depth}`),
      ],
    };
  }

  return definitions;
}

function buildSchemaExample() {
  return {
    $schema: 'https://schemas.zeropress.dev/preview-data/v0.7/schema.json',
    version: '0.7',
    generator: 'example-generator',
    generated_at: '2026-05-09T00:00:00Z',
    site: {
      title: 'Example Magazine',
      description: 'A ZeroPress example site.',
      url: 'https://example.com',
      media_origin: 'https://media.example.com',
      media_delivery_mode: 'media_domain',
      favicon: {
        icon: '/favicon.ico',
        icon_dark: '/favicon.dark.ico',
        svg: '/favicon.svg',
        png: '/favicon.png',
        apple_touch_icon: '/apple-touch-icon.png',
      },
      logo: { src: '/logo.svg', alt: 'Example Magazine' },
      comments: {
        enabled: true,
        api_base_url: 'https://comments.example.com',
        provider: 'zeropress',
        per_page: 50,
        order: 'desc',
        threading: { enabled: true, max_depth: 2 },
      },
      expose_generator: true,
      search: { enabled: true },
      feed: { enabled: true },
      archive: { enabled: true },
      locale: 'en-US',
      posts_per_page: 10,
      date_style: 'medium',
      time_style: 'none',
      timezone: 'UTC',
      robots: { allow_indexing: true },
      front_page: { type: 'theme_index' },
      post_index: { enabled: true, path: '/', paginate: true },
      footer: { copyright_text: 'Example Magazine', attribution: true },
      meta: { issue: 'Spring 2026', show_sponsor_banner: false },
    },
    content: {
      authors: [{ id: 'editor', display_name: 'Example Editor', avatar: '/avatars/editor.jpg' }],
      posts: [{
        public_id: 1,
        title: 'Hello ZeroPress',
        slug: 'hello-zeropress',
        content: '# Hello ZeroPress\n\nWelcome to the example post.',
        document_type: 'markdown',
        excerpt: 'Welcome to the example post.',
        published_at_iso: '2026-05-09T00:00:00Z',
        updated_at_iso: '2026-05-09T00:00:00Z',
        author_id: 'editor',
        featured_image: '/images/hello.jpg',
        meta: { badge: 'Feature' },
        data: {
          facts: [{ label: 'Role', value: 'Writing' }, { label: 'Year', value: '2026' }],
          stack: ['ZeroPress', 'Cloudflare'],
        },
        status: 'published',
        allow_comments: true,
        comments: { request_token: 'example-post-request-token' },
        category_slugs: ['news'],
        tag_slugs: ['intro'],
      }],
      pages: [{
        public_id: 2,
        title: 'About',
        slug: 'about',
        content: '# About\n\nAbout this site.',
        document_type: 'markdown',
        excerpt: 'About this site.',
        updated_at_iso: '2026-05-09T00:00:00Z',
        meta: { nav_label: 'About' },
        data: {
          swatches: [{ name: 'Ink', value: '#111111' }, { name: 'Paper', value: '#ffffff' }],
        },
        status: 'published',
        allow_comments: true,
        comments: { request_token: 'example-page-request-token' },
      }],
      categories: [{ name: 'News', slug: 'news', description: 'Site news and updates.' }],
      tags: [{ name: 'Intro', slug: 'intro', description: 'Introductory content.' }],
      media: [
        { src: '/avatars/editor.jpg', width: 512, height: 512, alt: 'Example Editor' },
        { src: '/images/hello.jpg', width: 1600, height: 900, alt: 'Hello ZeroPress cover image' },
      ],
    },
    menus: {
      primary: {
        name: 'Primary Menu',
        items: [
          { title: 'Home', url: '/', target: '_self', meta: { icon: 'home' }, children: [] },
          { title: 'About', url: '/about/', target: '_self', meta: { badge: 'New' }, children: [] },
        ],
      },
    },
    widgets: {
      sidebar: {
        name: 'Sidebar',
        items: [{
          type: 'text',
          title: 'About This Site',
          settings: { body: 'A short reusable widget example.' },
        }],
      },
    },
    collections: {
      'cover-story': {
        title: 'Cover Story',
        description: 'Curated content for a featured area.',
        items: [{ type: 'post', slug: 'hello-zeropress' }, { type: 'page', path: 'about' }],
      },
    },
    custom_html: {
      head_end: '<meta name="site-verification" content="example">',
    },
  };
}

const ROOT_SCHEMA_KEY_ORDER = Object.freeze([
  '$schema',
  '$id',
  'title',
  'description',
  'markdownDescription',
  'type',
  'additionalProperties',
  'required',
  'properties',
  '$defs',
  'allOf',
  'examples',
]);

const SCHEMA_KEY_ORDER = Object.freeze([
  '$ref',
  'type',
  'const',
  'enum',
  'default',
  'minLength',
  'maxLength',
  'minItems',
  'maxItems',
  'minProperties',
  'maxProperties',
  'minimum',
  'maximum',
  'format',
  'additionalProperties',
  'description',
  'markdownDescription',
  'required',
  'properties',
  'propertyNames',
  'items',
  'pattern',
  'oneOf',
  'anyOf',
  'allOf',
  'not',
  'if',
  'then',
  'else',
]);

function orderSchemaNode(value, { root = false } = {}) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return value;
  }

  const normalized = {};
  for (const [key, entry] of Object.entries(value)) {
    if (key === 'properties' || key === '$defs') {
      normalized[key] = Object.fromEntries(
        Object.entries(entry).map(([name, schema]) => [name, orderSchemaNode(schema)]),
      );
    } else if (key === 'allOf' || key === 'anyOf' || key === 'oneOf') {
      normalized[key] = entry.map((schema) => orderSchemaNode(schema));
    } else if (['additionalProperties', 'propertyNames', 'items', 'not', 'if', 'then', 'else'].includes(key)) {
      normalized[key] = orderSchemaNode(entry);
    } else {
      normalized[key] = entry;
    }
  }

  const preferredOrder = root ? ROOT_SCHEMA_KEY_ORDER : SCHEMA_KEY_ORDER;
  const rank = new Map(preferredOrder.map((key, index) => [key, index]));
  return Object.fromEntries(Object.entries(normalized).sort(([left], [right]) => {
    const leftRank = rank.get(left) ?? preferredOrder.length;
    const rightRank = rank.get(right) ?? preferredOrder.length;
    return leftRank - rightRank;
  }));
}

export function buildPreviewDataSchema() {
  const slugArray = () => ({ type: 'array', items: ref('slugSegment') });
  const orderedUniqueSlugArray = () => ({
    type: 'array',
    uniqueItems: true,
    items: ref('slugSegment'),
  });
  const dateTime = () => ref('dateTime');
  const meta = () => ref('previewMeta');
  const data = () => ref('structuredData');

  const schema = closedObject('root', {
    $schema: string(),
    version: { const: PREVIEW_DATA_VERSION },
    generator: nonBlankString(),
    generated_at: dateTime(),
    site: ref('site'),
    content: ref('content'),
    menus: ref('menus'),
    widgets: ref('widgets'),
    collections: ref('collections'),
    custom_css: ref('customCss'),
    custom_html: ref('customHtml'),
  }, {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: 'https://schemas.zeropress.dev/preview-data/v0.7/schema.json',
    title: 'ZeroPress Preview Data v0.7',
    description: 'Canonical site data consumed by ZeroPress Build Core and ZeroPress theme preview tooling.',
    markdownDescription: 'Canonical site data consumed by ZeroPress Build Core and ZeroPress theme preview tooling.',
    allOf: [contentCommentPolicySchema()],
    $defs: {
      slugSegment: string({
        minLength: 1,
        pattern: CONTENT_SLUG_PATTERN_SOURCE,
        ...NFC_SEGMENT_LENGTH_ANNOTATION,
        description: 'A slug segment containing only Unicode letters, combining marks, decimal digits, isolated internal periods, hyphen, and underscore, with at least one letter or digit. Periods may not lead, trail, or appear consecutively. Decomposed input is accepted; canonical results and length are evaluated after NFC normalization.',
      }),
      dateTime: string({
        format: 'date-time',
        pattern: RFC3339_PATTERN_SOURCE,
      }),
      absoluteWebUrl: webUrlSchema(),
      siteOrigin: siteOriginSchema(),
      mediaOrigin: mediaOriginSchema(),
      navigationUrl: navigationUrlSchema(),
      mediaUrl: mediaUrlSchema(),
      commentsApiBaseUrl: commentsApiBaseUrlSchema(),
      previewMeta: {
        type: 'object',
        additionalProperties: { type: ['string', 'number', 'boolean', 'null'] },
      },
      ...structuredDataDefinitions(),
      permalinks: closedObject('permalinks', {
        output_style: enumString(PREVIEW_PERMALINK_OUTPUT_STYLES),
        posts: ref('postPermalinkPattern'),
        pages: ref('slugPermalinkPattern'),
        categories: ref('slugPermalinkPattern'),
        tags: ref('slugPermalinkPattern'),
      }),
      permalinkPattern: nonBlankString(NFC_LITERAL_SEGMENT_LENGTH_ANNOTATION),
      postPermalinkPattern: {
        allOf: [
          ref('permalinkPattern'),
          permalinkPatternSchema(['slug', 'public_id', 'year', 'month', 'day'], '(?::slug|:public_id)'),
        ],
      },
      slugPermalinkPattern: {
        allOf: [ref('permalinkPattern'), permalinkPatternSchema(['slug'], ':slug')],
      },
      frontPage: closedObject('frontPage', {
        type: enumString(PREVIEW_FRONT_PAGE_TYPES),
        page_path: ref('pagePath', { 'x-zeropress-references': 'content.pages.effective_path' }),
        html: nonBlankString(),
      }, {
        oneOf: [
          {
            properties: { type: { const: 'theme_index' } },
            required: ['type'],
            not: { anyOf: [{ required: ['page_path'] }, { required: ['html'] }] },
          },
          {
            properties: { type: { const: 'page' } },
            required: ['type', 'page_path'],
            not: { required: ['html'] },
          },
          {
            properties: { type: { const: 'standalone_html' } },
            required: ['type', 'html'],
            not: { required: ['page_path'] },
          },
        ],
      }),
      postIndex: closedObject('postIndex', {
        enabled: { type: 'boolean' },
        path: ref('postIndexPath'),
        paginate: { type: 'boolean' },
      }),
      postIndexPath: string({
        pattern: `^${LITERAL_HTML_SEGMENT_GUARD_PATTERN_SOURCE}/(?:${CONTENT_SLUG_COMPONENT_PATTERN_SOURCE}(?:/${CONTENT_SLUG_COMPONENT_PATTERN_SOURCE})*/?)?$`,
        ...NFC_LITERAL_SEGMENT_LENGTH_ANNOTATION,
      }),
      pagePath: string({
        pattern: `^${LITERAL_HTML_SEGMENT_GUARD_PATTERN_SOURCE}${CONTENT_SLUG_COMPONENT_PATTERN_SOURCE}(?:/${CONTENT_SLUG_COMPONENT_PATTERN_SOURCE})*$`,
        ...NFC_LITERAL_SEGMENT_LENGTH_ANNOTATION,
        'x-zeropress-identity': 'effective-page-path',
      }),
      site: closedObject('site', {
        title: nonBlankString(),
        description: string(),
        url: ref('siteOrigin'),
        media_origin: ref('mediaOrigin'),
        media_delivery_mode: enumString(PREVIEW_MEDIA_DELIVERY_MODES),
        favicon: ref('siteFavicon'),
        logo: ref('siteLogo'),
        newsletter: ref('siteNewsletter'),
        comments: ref('siteComments'),
        expose_generator: { type: 'boolean', default: true },
        search: ref('siteFeatureState'),
        feed: ref('siteFeatureState'),
        archive: ref('siteFeatureState'),
        locale: ref('locale'),
        posts_per_page: { type: 'integer', minimum: 1 },
        date_style: enumString(PREVIEW_DATETIME_STYLES),
        time_style: enumString(PREVIEW_DATETIME_STYLES),
        timezone: ref('timezone'),
        robots: ref('siteRobots'),
        permalinks: ref('permalinks'),
        front_page: ref('frontPage'),
        post_index: ref('postIndex'),
        footer: ref('siteFooter'),
        meta: meta(),
      }, {
        allOf: [{
          if: {
            properties: { media_delivery_mode: { const: 'media_domain' } },
            required: ['media_delivery_mode'],
          },
          then: {
            properties: { media_origin: { minLength: 1 } },
          },
        }],
      }),
      locale: nonBlankString({
        minLength: 2,
        pattern: '^[A-Za-z]{2,8}(?:-[A-Za-z0-9]{1,8})*$',
        'x-zeropress-runtime-validation': 'canonical-bcp47',
      }),
      timezone: nonBlankString({
        pattern: String.raw`^(?:UTC|[+-](?:0\d|1[0-4]):[0-5]\d|[A-Za-z_+-]+(?:/[A-Za-z0-9_+-]+)+)$`,
        'x-zeropress-runtime-validation': 'canonical-iana-or-fixed-offset',
      }),
      siteRobots: closedObject('siteRobots', {
        allow_indexing: { type: 'boolean' },
      }),
      siteFavicon: closedObject('siteFavicon', {
        icon: ref('mediaUrl'),
        icon_dark: ref('mediaUrl'),
        svg: ref('mediaUrl'),
        png: ref('mediaUrl'),
        apple_touch_icon: ref('mediaUrl'),
      }, {
        anyOf: [
          { required: ['icon'] },
          { required: ['icon_dark'] },
          { required: ['svg'] },
          { required: ['png'] },
          { required: ['apple_touch_icon'] },
        ],
      }),
      siteLogo: closedObject('siteLogo', {
        src: ref('mediaUrl'),
        alt: string(),
      }),
      siteNewsletter: closedObject('siteNewsletter', {
        enabled: { type: 'boolean' },
        title: string(),
        description: string(),
        button_label: string(),
        signup_url: ref('navigationUrl'),
        embed_url: ref('navigationUrl'),
      }, {
        allOf: [{
          if: { properties: { enabled: { const: true } }, required: ['enabled'] },
          then: { anyOf: [{ required: ['signup_url'] }, { required: ['embed_url'] }] },
        }],
      }),
      siteFeatureState: closedObject('siteFeatureState', {
        enabled: { type: 'boolean' },
      }),
      siteComments: closedObject('siteComments', {
        enabled: { type: 'boolean' },
        api_base_url: ref('commentsApiBaseUrl'),
        provider: enumString(PREVIEW_COMMENTS_PROVIDERS),
        per_page: { type: 'integer', minimum: 1, maximum: 100 },
        order: enumString(PREVIEW_COMMENTS_ORDERS),
        threading: ref('siteCommentsThreading'),
      }),
      siteCommentsThreading: closedObject('siteCommentsThreading', {
        enabled: { type: 'boolean' },
        max_depth: { type: 'integer', minimum: 2, maximum: 10 },
      }),
      contentComments: closedObject('contentComments', {
        request_token: nonBlankString({ maxLength: PREVIEW_COMMENT_REQUEST_TOKEN_MAX_LENGTH }),
      }),
      siteFooter: closedObject('siteFooter', {
        copyright_text: nonBlankString(),
        attribution: { type: 'boolean' },
      }),
      author: closedObject('author', {
        id: nonBlankString(),
        display_name: nonBlankString(),
        avatar: ref('mediaUrl'),
      }),
      media: closedObject('media', {
        src: ref('mediaUrl'),
        width: { type: 'integer', minimum: 1 },
        height: { type: 'integer', minimum: 1 },
        alt: string(),
      }),
      post: closedObject('post', {
        public_id: { type: 'integer', minimum: 1 },
        title: nonBlankString(),
        slug: ref('slugSegment', { 'x-zeropress-unique-after-normalization': 'NFC' }),
        content: string(),
        document_type: enumString(PREVIEW_DOCUMENT_TYPES),
        excerpt: string(),
        published_at_iso: dateTime(),
        updated_at_iso: dateTime(),
        author_id: nonBlankString(),
        featured_image: ref('mediaUrl'),
        meta: meta(),
        data: data(),
        status: enumString(['published', 'draft']),
        discoverability: enumString(PREVIEW_DISCOVERABILITY_VALUES),
        allow_comments: { type: 'boolean' },
        comments: ref('contentComments'),
        category_slugs: slugArray(),
        tag_slugs: {
          ...orderedUniqueSlugArray(),
          'x-zeropress-unique-after-normalization': 'NFC',
        },
      }),
      page: closedObject('page', {
        public_id: { type: 'integer', minimum: 1 },
        title: nonBlankString(),
        slug: ref('slugSegment'),
        path: ref('pagePath'),
        content: string(),
        document_type: enumString(PREVIEW_DOCUMENT_TYPES),
        excerpt: string(),
        featured_image: ref('mediaUrl'),
        updated_at_iso: dateTime(),
        meta: meta(),
        data: data(),
        status: enumString(['published', 'draft']),
        discoverability: enumString(PREVIEW_DISCOVERABILITY_VALUES),
        allow_comments: { type: 'boolean' },
        comments: ref('contentComments'),
      }, {
        allOf: [{
          if: {
            properties: { allow_comments: { const: true } },
            required: ['allow_comments'],
          },
          then: { required: ['public_id'] },
        }],
      }),
      category: closedObject('category', {
        name: nonBlankString(),
        slug: ref('slugSegment'),
        description: string(),
      }),
      tag: closedObject('tag', {
        name: nonBlankString(),
        slug: ref('slugSegment'),
        description: string(),
      }),
      menuItem: closedObject('menuItem', {
        title: nonBlankString(),
        url: ref('navigationUrl'),
        target: enumString(PREVIEW_MENU_TARGETS),
        meta: meta(),
        children: { type: 'array', items: ref('menuItem') },
      }),
      menu: closedObject('menu', {
        name: nonBlankString(),
        items: { type: 'array', items: ref('menuItem') },
      }),
      menus: {
        type: 'object',
        propertyNames: string({ pattern: PREVIEW_MENU_ID_PATTERN_SOURCE }),
        additionalProperties: ref('menu'),
      },
      widgetItem: closedObject('widgetItem', {
        type: nonBlankString(),
        title: string(),
        settings: { type: 'object', additionalProperties: true },
      }),
      widgetArea: closedObject('widgetArea', {
        name: nonBlankString(),
        items: { type: 'array', items: ref('widgetItem') },
      }),
      widgets: {
        type: 'object',
        propertyNames: string({ pattern: PREVIEW_WIDGET_AREA_ID_PATTERN_SOURCE }),
        additionalProperties: ref('widgetArea'),
      },
      collectionItem: closedObject('collectionItem', {
        type: enumString(PREVIEW_COLLECTION_ITEM_TYPES),
        slug: ref('slugSegment', { 'x-zeropress-references': 'content.posts.slug' }),
        path: ref('pagePath', { 'x-zeropress-references': 'content.pages.effective_path' }),
      }, {
        oneOf: [
          {
            properties: { type: { const: 'post' } },
            required: ['type', 'slug'],
            not: { required: ['path'] },
          },
          {
            properties: { type: { const: 'page' } },
            required: ['type', 'path'],
            not: { required: ['slug'] },
          },
        ],
      }),
      collection: closedObject('collection', {
        title: nonBlankString(),
        description: string(),
        items: { type: 'array', uniqueItems: true, items: ref('collectionItem') },
      }),
      collections: {
        type: 'object',
        propertyNames: string({ pattern: PREVIEW_COLLECTION_ID_PATTERN_SOURCE }),
        additionalProperties: ref('collection'),
      },
      customCss: closedObject('customCss', {
        content: nonBlankString(),
      }),
      customHtml: closedObject('customHtml', {
        head_end: nonBlankString({ maxLength: PREVIEW_CUSTOM_HTML_SLOT_MAX_LENGTH }),
        body_end: nonBlankString({ maxLength: PREVIEW_CUSTOM_HTML_SLOT_MAX_LENGTH }),
      }, {
        anyOf: [{ required: ['head_end'] }, { required: ['body_end'] }],
      }),
      zeroPressCommentsItemPolicy: {
        if: {
          properties: { allow_comments: { const: true } },
          required: ['allow_comments'],
        },
        then: { required: ['comments'] },
      },
      contentWithZeroPressCommentsPolicy: {
        type: 'object',
        properties: {
          posts: { type: 'array', items: ref('zeroPressCommentsItemPolicy') },
          pages: { type: 'array', items: ref('zeroPressCommentsItemPolicy') },
        },
      },
      content: closedObject('content', {
        authors: { type: 'array', items: ref('author') },
        posts: { type: 'array', items: ref('post') },
        pages: { type: 'array', items: ref('page') },
        categories: { type: 'array', items: ref('category') },
        tags: { type: 'array', items: ref('tag') },
        media: { type: 'array', items: ref('media') },
      }),
    },
  });

  schema.examples = [buildSchemaExample()];
  return orderSchemaNode(applySchemaAnnotations(schema), { root: true });
}
