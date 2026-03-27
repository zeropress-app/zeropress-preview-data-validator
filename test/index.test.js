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
      language: 'en',
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
          published_at: '2026-03-25 09:00',
          updated_at: '2026-03-25 09:00',
          published_at_iso: '2026-03-25T09:00:00.000Z',
          updated_at_iso: '2026-03-25T09:00:00.000Z',
          reading_time: '1 min read',
          author_name: 'Admin',
          categories_html: '<a href="/categories/general/">General (1)</a>',
          tags_html: '<a href="/tags/intro/">Intro (1)</a>',
          comments_html: '<div id="comments"></div>',
          status: 'published',
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
          postCount: 1,
        },
      ],
      tags: [
        {
          id: 'tag-1',
          name: 'Intro',
          slug: 'intro',
          postCount: 1,
        },
      ],
    },
    routes: {
      index: {
        posts: '<article>Index</article>',
        categories: '<a>General</a>',
        tags: '<a>Intro</a>',
        pagination: '',
      },
      archive: {
        posts: '<article>Archive</article>',
        pagination: '',
      },
      categories: [
        {
          slug: 'general',
          posts: '<article>Category</article>',
          pagination: '',
          categories: '<a>General</a>',
        },
      ],
      tags: [
        {
          slug: 'intro',
          posts: '<article>Tag</article>',
          pagination: '',
          tags: '<a>Intro</a>',
        },
      ],
    },
  };
}

test('validatePreviewData accepts a valid v0.2 payload', () => {
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

test('validatePreviewData rejects invalid route block shapes', () => {
  const data = createValidPreviewData();
  delete data.routes.index.categories;

  const result = validatePreviewData(data);
  assert.equal(result.ok, false);
  assert.equal(result.errors.some((issue) => issue.path === 'routes.index.categories'), true);
});

test('validatePreviewData rejects extra root keys but allows extra site keys', () => {
  const data = createValidPreviewData();
  data.unexpected = true;

  const result = validatePreviewData(data);
  assert.equal(result.ok, false);
  assert.equal(result.errors.some((issue) => issue.path === 'unexpected'), true);
  assert.equal(data.site.custom_setting, 'value');
});

test('validatePreviewData allows content category description to be omitted', () => {
  const data = createValidPreviewData();
  delete data.content.categories[0].description;

  const result = validatePreviewData(data);
  assert.equal(result.ok, true);
});

test('assertPreviewData throws on invalid payload', () => {
  const data = createValidPreviewData();
  data.version = '0.1';

  assert.throws(() => assertPreviewData(data), /INVALID_VERSION/);
});

test('isPreviewData narrows valid payloads', () => {
  assert.equal(isPreviewData(createValidPreviewData()), true);
  assert.equal(isPreviewData({ version: PREVIEW_DATA_VERSION }), false);
});
