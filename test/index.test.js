import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PREVIEW_DATA_VERSION,
  assertPreviewData,
  isPreviewData,
  validatePreviewData,
} from '../src/index.js';

function createValidPreviewData() {
  return {
    version: PREVIEW_DATA_VERSION,
    generator: 'zeropress-preview-data-validator-test',
    generated_at: '2026-03-26T00:00:00.000Z',
    site: {
      title: 'ZeroPress Preview',
      description: 'Preview contract fixture',
      url: 'https://example.com',
      locale: 'en-US',
      postsPerPage: 10,
      dateFormat: 'YYYY-MM-DD',
      timeFormat: 'HH:mm',
      timezone: 'UTC',
      disallowComments: false,
      custom_setting: 'value',
    },
    content: {
      posts: [
        {
          id: 'post-1',
          public_id: 101,
          title: 'Hello ZeroPress',
          slug: 'hello-zeropress',
          html: '<p>Preview post content</p>',
          excerpt: 'Preview excerpt',
          published_at_iso: '2026-03-25T09:00:00.000Z',
          updated_at_iso: '2026-03-25T09:00:00.000Z',
          author_name: 'Admin',
          status: 'published',
          allow_comments: true,
          category_slugs: ['general'],
          tag_slugs: ['intro'],
        },
      ],
      pages: [
        {
          id: 'page-1',
          title: 'About',
          slug: 'about',
          html: '<p>About page</p>',
          status: 'published',
        },
      ],
      categories: [
        {
          id: 'cat-1',
          name: 'General',
          slug: 'general',
          description: 'General posts',
        },
      ],
      tags: [
        {
          id: 'tag-1',
          name: 'Intro',
          slug: 'intro',
          description: 'Intro tag',
        },
      ],
    },
  };
}

test('validatePreviewData accepts a valid v0.4 payload', () => {
  const result = validatePreviewData(createValidPreviewData());
  assert.equal(result.ok, true);
  assert.equal(result.errors.length, 0);
});

test('validatePreviewData rejects missing public_id', () => {
  const data = createValidPreviewData();
  delete data.content.posts[0].public_id;

  const result = validatePreviewData(data);
  assert.equal(result.ok, false);
  assert.equal(result.errors.some((issue) => issue.path === 'content.posts[0].public_id'), true);
});

test('validatePreviewData rejects missing status on post or page', () => {
  const data = createValidPreviewData();
  delete data.content.posts[0].status;
  delete data.content.pages[0].status;

  const result = validatePreviewData(data);
  assert.equal(result.ok, false);
  assert.equal(result.errors.some((issue) => issue.path === 'content.posts[0].status'), true);
  assert.equal(result.errors.some((issue) => issue.path === 'content.pages[0].status'), true);
});

test('validatePreviewData rejects missing allow_comments on post', () => {
  const data = createValidPreviewData();
  delete data.content.posts[0].allow_comments;

  const result = validatePreviewData(data);
  assert.equal(result.ok, false);
  assert.equal(result.errors.some((issue) => issue.path === 'content.posts[0].allow_comments'), true);
});

test('validatePreviewData rejects legacy render-ready fields', () => {
  const data = createValidPreviewData();
  data.site.site_name = 'Legacy name';
  data.content.posts[0].published_at = '2026-03-25 09:00';
  data.content.posts[0].categories_html = '<a href="/categories/general/">General</a>';
  data.content.categories[0].postCount = 1;
  data.routes = { index: [] };

  const result = validatePreviewData(data);
  assert.equal(result.ok, false);
  assert.equal(result.errors.some((issue) => issue.path === 'site.site_name'), true);
  assert.equal(result.errors.some((issue) => issue.path === 'content.posts[0].published_at'), true);
  assert.equal(result.errors.some((issue) => issue.path === 'content.posts[0].categories_html'), true);
  assert.equal(result.errors.some((issue) => issue.path === 'content.categories[0].postCount'), true);
  assert.equal(result.errors.some((issue) => issue.path === 'routes'), true);
});

test('validatePreviewData rejects snake_case locale and timezone site keys', () => {
  const data = createValidPreviewData();
  data.site.site_timezone = 'UTC';
  data.site.site_locale = 'en_US';

  const result = validatePreviewData(data);
  assert.equal(result.ok, false);
  assert.equal(result.errors.some((issue) => issue.path === 'site.site_timezone'), true);
  assert.equal(result.errors.some((issue) => issue.path === 'site.site_locale'), true);
});

test('validatePreviewData rejects replaced preview-data v0.4 site keys', () => {
  const data = createValidPreviewData();
  data.site.language = 'en-US';
  data.site.siteLocale = 'en-US';
  data.site.siteTimezone = 'UTC';

  const result = validatePreviewData(data);
  assert.equal(result.ok, false);
  assert.equal(result.errors.some((issue) => issue.path === 'site.language'), true);
  assert.equal(result.errors.some((issue) => issue.path === 'site.siteLocale'), true);
  assert.equal(result.errors.some((issue) => issue.path === 'site.siteTimezone'), true);
});

test('validatePreviewData allows extra site keys for future theme-facing settings', () => {
  const data = createValidPreviewData();
  data.site.heroTitle = 'Hello';

  const result = validatePreviewData(data);
  assert.equal(result.ok, true);
});

test('validatePreviewData allows content category and tag descriptions to be omitted', () => {
  const data = createValidPreviewData();
  delete data.content.categories[0].description;
  delete data.content.tags[0].description;

  const result = validatePreviewData(data);
  assert.equal(result.ok, true);
});

test('validatePreviewData allows an empty string for site.url', () => {
  const data = createValidPreviewData();
  data.site.url = '';

  const result = validatePreviewData(data);
  assert.equal(result.ok, true);
});

test('validatePreviewData still rejects whitespace-only site.url', () => {
  const data = createValidPreviewData();
  data.site.url = '   ';

  const result = validatePreviewData(data);
  assert.equal(result.ok, false);
  assert.equal(result.errors.some((issue) => issue.path === 'site.url'), true);
});

test('assertPreviewData throws on invalid payload', () => {
  const data = createValidPreviewData();
  data.version = '0.3';

  assert.throws(() => assertPreviewData(data), /INVALID_VERSION/);
});

test('isPreviewData narrows valid payloads', () => {
  assert.equal(isPreviewData(createValidPreviewData()), true);
  assert.equal(isPreviewData({ version: PREVIEW_DATA_VERSION }), false);
});
