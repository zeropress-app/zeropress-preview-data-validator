import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { canonicalizePreviewDataKeyOrder } from '../src/index.js';
import { PREVIEW_DATA_V07_KEY_ORDERS } from '../src/canonicalize.js';

const SCHEMA_PATH = new URL('../schemas/preview-data.v0.7.schema.json', import.meta.url);

function reverseKeys(value) {
  return Object.fromEntries(Object.entries(value).reverse());
}

function reverseObjectKeyInsertion(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => reverseObjectKeyInsertion(entry));
  }
  if (value === null || typeof value !== 'object') {
    return value;
  }
  return Object.fromEntries(
    Object.entries(value)
      .reverse()
      .map(([key, entry]) => [key, reverseObjectKeyInsertion(entry)]),
  );
}

function createDisorderedPayload() {
  const post = reverseKeys({
    public_id: 2,
    title: 'Second post',
    slug: 'second-post',
    content: '<p>Second</p>',
    document_type: 'html',
    excerpt: 'Second',
    published_at_iso: '2026-07-17T00:00:00Z',
    updated_at_iso: '2026-07-17T01:00:00Z',
    author_id: 'second-author',
    featured_image: '/second.jpg',
    meta: reverseKeys({ z_meta: 'z', a_meta: 'a', nested: reverseKeys({ z: 2, a: 1 }) }),
    data: reverseKeys({ z_data: true, a_data: false, rows: [reverseKeys({ z: 2, a: 1 })] }),
    status: 'published',
    discoverability: 'default',
    allow_comments: true,
    comments: reverseKeys({ request_token: 'post-token' }),
    category_slugs: ['second', 'first'],
    tag_slugs: ['z-tag', 'a-tag'],
    z_unknown: reverseKeys({ z: 2, a: 1 }),
    a_unknown: 'kept after known keys',
  });

  const page = reverseKeys({
    public_id: 3,
    title: 'Example page',
    slug: 'example-page',
    path: 'parent/example-page',
    content: '<p>Page</p>',
    document_type: 'html',
    excerpt: 'Page',
    featured_image: '/page.jpg',
    updated_at_iso: '2026-07-17T02:00:00Z',
    meta: reverseKeys({ z: 'z', a: 'a' }),
    data: reverseKeys({ z: 2, a: 1 }),
    status: 'published',
    discoverability: 'noindex',
    allow_comments: true,
    comments: reverseKeys({ request_token: 'page-token' }),
  });

  const menuItem = reverseKeys({
    title: 'Second menu item',
    url: '/second/',
    target: '_self',
    meta: reverseKeys({ z_icon: 'z', a_icon: 'a' }),
    children: [reverseKeys({
      title: 'Child menu item',
      url: '/child/',
      target: '_self',
      meta: reverseKeys({ z: 2, a: 1 }),
      children: [],
    })],
  });

  const widgetItem = reverseKeys({
    type: 'text',
    title: 'Text widget',
    settings: reverseKeys({
      z_setting: 'z',
      a_setting: 'a',
      nested: reverseKeys({ z: 2, a: 1 }),
      sequence: [reverseKeys({ z: 2, a: 1 }), reverseKeys({ b: 2, a: 1 })],
    }),
  });

  const collection = reverseKeys({
    title: 'Collection',
    description: 'Example collection',
    items: [
      reverseKeys({ type: 'post', slug: 'second-post' }),
      reverseKeys({ type: 'page', path: 'parent/example-page' }),
    ],
  });

  return reverseKeys({
    $schema: 'https://schemas.zeropress.dev/preview-data/v0.7/schema.json',
    version: '0.7',
    generator: 'canonical-order-test',
    generated_at: '2026-07-17T00:00:00Z',
    site: reverseKeys({
      title: 'Example site',
      description: 'Example description',
      url: 'https://example.com',
      media_origin: 'https://media.example.com',
      media_delivery_mode: 'media_domain',
      favicon: reverseKeys({
        icon: '/favicon.ico',
        icon_dark: '/favicon.dark.ico',
        svg: '/favicon.svg',
        png: '/favicon.png',
        apple_touch_icon: '/apple-touch-icon.png',
      }),
      logo: reverseKeys({ src: '/logo.svg', alt: 'Example logo' }),
      newsletter: reverseKeys({
        enabled: true,
        title: 'Newsletter',
        description: 'Newsletter description',
        button_label: 'Subscribe',
        signup_url: '/subscribe',
        embed_url: '/embed',
      }),
      comments: reverseKeys({
        enabled: true,
        api_base_url: '/api',
        provider: 'zeropress',
        per_page: 50,
        order: 'desc',
        threading: reverseKeys({ enabled: true, max_depth: 2 }),
      }),
      expose_generator: true,
      search: reverseKeys({ enabled: true }),
      feed: reverseKeys({ enabled: false }),
      archive: reverseKeys({ enabled: true }),
      locale: 'en-US',
      posts_per_page: 10,
      date_style: 'medium',
      time_style: 'short',
      timezone: 'UTC',
      robots: reverseKeys({ allow_indexing: true }),
      permalinks: reverseKeys({
        output_style: 'directory',
        posts: '/posts/:slug/',
        pages: '/:slug/',
        categories: '/categories/:slug/',
        tags: '/tags/:slug/',
      }),
      front_page: reverseKeys({ type: 'page', page_path: 'parent/example-page' }),
      post_index: reverseKeys({ enabled: true, path: '/posts/', paginate: true }),
      footer: reverseKeys({ copyright_text: 'Example', attribution: true }),
      meta: reverseKeys({ z_site: 'z', a_site: 'a', nested: reverseKeys({ z: 2, a: 1 }) }),
      z_unknown: reverseKeys({ z: 2, a: 1 }),
      a_unknown: 'kept after known keys',
    }),
    content: reverseKeys({
      authors: [
        reverseKeys({ id: 'second-author', display_name: 'Second Author', avatar: '/second.png' }),
        reverseKeys({ id: 'first-author', display_name: 'First Author', avatar: '/first.png' }),
      ],
      posts: [post, reverseKeys({ ...post, public_id: 1, title: 'First post', slug: 'first-post' })],
      pages: [page],
      categories: [reverseKeys({ name: 'Category', slug: 'category', description: 'Category description' })],
      tags: [reverseKeys({ name: 'Tag', slug: 'tag', description: 'Tag description' })],
      media: [reverseKeys({ src: '/second.jpg', width: 1600, height: 900, alt: 'Second image' })],
    }),
    menus: reverseKeys({
      'z-menu': reverseKeys({ name: 'Z menu', items: [menuItem] }),
      'a-menu': reverseKeys({ name: 'A menu', items: [reverseKeys({ ...menuItem, title: 'First menu item' })] }),
    }),
    widgets: reverseKeys({
      'z-area': reverseKeys({ name: 'Z area', items: [widgetItem] }),
      'a-area': reverseKeys({ name: 'A area', items: [reverseKeys({ ...widgetItem, title: 'First widget' })] }),
    }),
    collections: reverseKeys({
      'z-collection': collection,
      'a-collection': reverseKeys({ ...collection, title: 'A collection' }),
    }),
    custom_css: reverseKeys({ content: 'body { color: black; }' }),
    custom_html: reverseKeys({ head_end: '<meta name="test">', body_end: '<script></script>' }),
    z_unknown: reverseKeys({ z: 2, a: 1 }),
    a_unknown: 'kept after known keys',
  });
}

test('canonical key tables exhaustively match v0.7 schema property order', async () => {
  const schema = JSON.parse(await fs.readFile(SCHEMA_PATH, 'utf8'));
  const internalPolicyDefinitionNames = Object.entries(schema.$defs)
    .filter(([, definition]) => definition?.properties && definition.additionalProperties !== false)
    .map(([name]) => name)
    .sort();
  const closedDefinitionNames = Object.entries(schema.$defs)
    .filter(([, definition]) => definition?.additionalProperties === false && definition.properties)
    .map(([name]) => name)
    .sort();

  assert.deepEqual(internalPolicyDefinitionNames, ['contentWithZeroPressCommentsPolicy']);
  assert.deepEqual(
    Object.keys(PREVIEW_DATA_V07_KEY_ORDERS).filter((name) => name !== 'root').sort(),
    closedDefinitionNames,
  );
  assert.deepEqual(PREVIEW_DATA_V07_KEY_ORDERS.root, Object.keys(schema.properties));

  for (const name of closedDefinitionNames) {
    assert.deepEqual(
      PREVIEW_DATA_V07_KEY_ORDERS[name],
      Object.keys(schema.$defs[name].properties),
      `${name} key order must match the committed schema`,
    );
  }
});

test('committed v0.7 schema example already follows canonical key order', async () => {
  const schema = JSON.parse(await fs.readFile(SCHEMA_PATH, 'utf8'));
  for (const example of schema.examples) {
    assert.equal(
      JSON.stringify(example),
      JSON.stringify(canonicalizePreviewDataKeyOrder(example)),
    );
  }
});

test('canonicalizePreviewDataKeyOrder orders every known record without mutating values or arrays', () => {
  const input = createDisorderedPayload();
  const inputBefore = JSON.stringify(input);
  const output = canonicalizePreviewDataKeyOrder(input);

  assert.deepEqual(output, input);
  assert.equal(JSON.stringify(input), inputBefore);
  assert.notStrictEqual(output, input);
  assert.notStrictEqual(output.site, input.site);
  assert.notStrictEqual(output.content.posts, input.content.posts);
  assert.notStrictEqual(output.content.posts[0], input.content.posts[0]);
  assert.notStrictEqual(output.content.posts[0].meta, input.content.posts[0].meta);

  const records = {
    root: output,
    permalinks: output.site.permalinks,
    frontPage: output.site.front_page,
    postIndex: output.site.post_index,
    site: output.site,
    siteFavicon: output.site.favicon,
    siteLogo: output.site.logo,
    siteNewsletter: output.site.newsletter,
    siteFeatureState: output.site.search,
    siteRobots: output.site.robots,
    siteComments: output.site.comments,
    siteCommentsThreading: output.site.comments.threading,
    contentComments: output.content.posts[0].comments,
    siteFooter: output.site.footer,
    author: output.content.authors[0],
    media: output.content.media[0],
    post: output.content.posts[0],
    page: output.content.pages[0],
    category: output.content.categories[0],
    tag: output.content.tags[0],
    menuItem: output.menus['a-menu'].items[0],
    menu: output.menus['a-menu'],
    widgetItem: output.widgets['a-area'].items[0],
    widgetArea: output.widgets['a-area'],
    collectionItem: output.collections['a-collection'].items[0],
    collection: output.collections['a-collection'],
    customCss: output.custom_css,
    customHtml: output.custom_html,
    content: output.content,
  };

  for (const [name, record] of Object.entries(records)) {
    const presentKnownKeys = PREVIEW_DATA_V07_KEY_ORDERS[name]
      .filter((key) => Object.hasOwn(record, key));
    const unknownKeys = Object.keys(record)
      .filter((key) => !PREVIEW_DATA_V07_KEY_ORDERS[name].includes(key))
      .sort();
    assert.deepEqual(
      Object.keys(record),
      [...presentKnownKeys, ...unknownKeys],
      `${name} must follow canonical key order`,
    );
  }

  assert.deepEqual(output.content.authors.map((author) => author.id), ['second-author', 'first-author']);
  assert.deepEqual(output.content.posts.map((entry) => entry.public_id), [2, 1]);
  assert.deepEqual(output.content.posts[0].category_slugs, ['second', 'first']);
  assert.deepEqual(output.content.posts[0].data.rows, [{ a: 1, z: 2 }]);
  assert.deepEqual(output.widgets['a-area'].items[0].settings.sequence, [{ a: 1, z: 2 }, { a: 1, b: 2 }]);
});

test('canonicalizePreviewDataKeyOrder sorts named and open maps lexically', () => {
  const output = canonicalizePreviewDataKeyOrder(createDisorderedPayload());

  assert.deepEqual(Object.keys(output.menus), ['a-menu', 'z-menu']);
  assert.deepEqual(Object.keys(output.widgets), ['a-area', 'z-area']);
  assert.deepEqual(Object.keys(output.collections), ['a-collection', 'z-collection']);
  assert.deepEqual(Object.keys(output.site.meta), ['a_site', 'nested', 'z_site']);
  assert.deepEqual(Object.keys(output.site.meta.nested), ['a', 'z']);
  assert.deepEqual(Object.keys(output.content.posts[0].meta), ['a_meta', 'nested', 'z_meta']);
  assert.deepEqual(Object.keys(output.content.posts[0].data), ['a_data', 'rows', 'z_data']);
  assert.deepEqual(Object.keys(output.widgets['a-area'].items[0].settings), [
    'a_setting',
    'nested',
    'sequence',
    'z_setting',
  ]);
  assert.deepEqual(Object.keys(output.z_unknown), ['a', 'z']);
  assert.deepEqual(Object.keys(output.site.z_unknown), ['a', 'z']);
});

test('canonicalizePreviewDataKeyOrder is idempotent and deterministic for JSON serialization', () => {
  const input = createDisorderedPayload();
  const equivalentWithDifferentInsertionOrder = reverseObjectKeyInsertion(input);
  const once = canonicalizePreviewDataKeyOrder(input);
  const twice = canonicalizePreviewDataKeyOrder(once);

  assert.notStrictEqual(twice, once);
  assert.equal(JSON.stringify(twice), JSON.stringify(once));
  assert.equal(
    JSON.stringify(canonicalizePreviewDataKeyOrder(equivalentWithDifferentInsertionOrder)),
    JSON.stringify(once),
  );
});
