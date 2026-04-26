import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
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
    generated_at: '2026-03-26T00:00:00Z',
    site: {
      title: 'ZeroPress Preview',
      description: 'Preview contract fixture',
      url: 'https://example.com',
      mediaBaseUrl: 'https://media.example.com',
      locale: 'en-US',
      postsPerPage: 10,
      dateFormat: 'YYYY-MM-DD',
      timeFormat: 'HH:mm',
      timezone: 'UTC',
      disallowComments: false,
      custom_setting: 'value',
    },
    content: {
      authors: [
        {
          id: 'author-1',
          display_name: 'Admin',
          avatar: '/images/admin-avatar.png',
        },
      ],
      posts: [
        {
          public_id: 101,
          title: 'Hello ZeroPress',
          slug: 'hello-zeropress',
          content: '# Preview post content',
          document_type: 'markdown',
          excerpt: 'Preview excerpt',
          published_at_iso: '2026-03-25T09:00:00Z',
          updated_at_iso: '2026-03-25T09:00:00Z',
          author_id: 'author-1',
          status: 'published',
          allow_comments: true,
          category_slugs: ['general'],
          tag_slugs: ['intro'],
        },
      ],
      pages: [
        {
          title: 'About',
          slug: 'about',
          content: '<p>About page</p>',
          document_type: 'html',
          excerpt: 'About excerpt',
          featured_image: '/images/about-card.png',
          status: 'published',
        },
      ],
      categories: [
        {
          name: 'General',
          slug: 'general',
          description: 'General posts',
        },
      ],
      tags: [
        {
          name: 'Intro',
          slug: 'intro',
          description: 'Intro tag',
        },
      ],
    },
    menus: {
      primary: {
        name: 'Primary Menu',
        items: [
          {
            title: 'Home',
            url: '/',
            type: 'custom',
            target: '_self',
            children: [],
          },
        ],
      },
    },
    widgets: {
      sidebar: {
        name: 'Sidebar Widgets',
        items: [
          {
            type: 'profile',
            title: 'About this blog',
            settings: {
              display_name: 'Admin',
              bio_short: 'Preview profile',
            },
          },
        ],
      },
    },
  };
}

function getIssueAtPath(result, issuePath) {
  return result.errors.find((issue) => issue.path === issuePath);
}

test('validatePreviewData accepts a valid v0.5 payload', () => {
  const result = validatePreviewData(createValidPreviewData());
  assert.equal(result.ok, true);
  assert.equal(result.errors.length, 0);
});

test('validatePreviewData accepts optional root $schema editor hint', () => {
  const data = createValidPreviewData();
  data.$schema = 'https://zeropress.dev/schemas/preview-data.v0.5.schema.json';

  const result = validatePreviewData(data);
  assert.equal(result.ok, true);
  assert.equal(result.errors.length, 0);
});

test('validatePreviewData rejects non-string root $schema editor hint', () => {
  const data = createValidPreviewData();
  data.$schema = true;

  const result = validatePreviewData(data);
  const issue = getIssueAtPath(result, '$schema');

  assert.equal(result.ok, false);
  assert.ok(issue);
  assert.equal(issue.code, 'INVALID_SCHEMA_HINT');
});

test('validatePreviewData accepts optional scalar meta on posts and pages', () => {
  const data = createValidPreviewData();
  data.content.posts[0].meta = {
    label: 'Featured',
    score: 4.5,
    featured: true,
    note: null,
  };
  data.content.pages[0].meta = {
    section: 'docs',
    order: 2,
    hidden: false,
    note: null,
  };

  const result = validatePreviewData(data);
  assert.equal(result.ok, true);
  assert.equal(result.errors.length, 0);
});

test('validatePreviewData rejects non-object post and page meta', () => {
  const data = createValidPreviewData();
  data.content.posts[0].meta = 'featured';
  data.content.pages[0].meta = ['docs'];

  const result = validatePreviewData(data);
  assert.equal(result.ok, false);
  assert.equal(result.errors.some((issue) => issue.path === 'content.posts[0].meta'), true);
  assert.equal(result.errors.some((issue) => issue.path === 'content.pages[0].meta'), true);
});

test('validatePreviewData rejects nested post and page meta values', () => {
  const data = createValidPreviewData();
  data.content.posts[0].meta = {
    nested: { label: 'Featured' },
    list: ['featured'],
  };
  data.content.pages[0].meta = {
    nested: { section: 'docs' },
    list: ['docs'],
  };

  const result = validatePreviewData(data);
  assert.equal(result.ok, false);
  assert.equal(result.errors.some((issue) => issue.path === 'content.posts[0].meta.nested'), true);
  assert.equal(result.errors.some((issue) => issue.path === 'content.posts[0].meta.list'), true);
  assert.equal(result.errors.some((issue) => issue.path === 'content.pages[0].meta.nested'), true);
  assert.equal(result.errors.some((issue) => issue.path === 'content.pages[0].meta.list'), true);
});

test('validatePreviewData accepts posts without internal id', () => {
  const data = createValidPreviewData();
  const result = validatePreviewData(data);
  assert.equal(result.ok, true);
  assert.equal(result.errors.some((issue) => issue.path === 'content.posts[0].id'), false);
});

test('validatePreviewData accepts valid Unicode and Hangul slug segments', () => {
  const data = createValidPreviewData();
  data.content.posts[0].slug = '안녕하세요-제로프레스';
  data.content.pages[0].slug = '회사소개';
  data.content.categories[0].slug = '디자인';
  data.content.tags[0].slug = '한글';
  data.content.posts[0].category_slugs = ['디자인'];
  data.content.posts[0].tag_slugs = ['한글'];

  const result = validatePreviewData(data);
  assert.equal(result.ok, true);
});

test('validatePreviewData rejects a post slug of "."', () => {
  const data = createValidPreviewData();
  data.content.posts[0].slug = '.';

  const result = validatePreviewData(data);
  const issue = getIssueAtPath(result, 'content.posts[0].slug');

  assert.equal(result.ok, false);
  assert.ok(issue);
  assert.equal(issue.code, 'INVALID_POST_SLUG');
});

test('validatePreviewData rejects a post slug of ".."', () => {
  const data = createValidPreviewData();
  data.content.posts[0].slug = '..';

  const result = validatePreviewData(data);
  const issue = getIssueAtPath(result, 'content.posts[0].slug');

  assert.equal(result.ok, false);
  assert.ok(issue);
  assert.equal(issue.code, 'INVALID_POST_SLUG');
});

test('validatePreviewData rejects traversal-looking post slugs', () => {
  const cases = ['../escape', 'a/b', 'a\\b', '%2e%2e', ' hello ', 'hello world'];

  for (const slug of cases) {
    const data = createValidPreviewData();
    data.content.posts[0].slug = slug;

    const result = validatePreviewData(data);
    const issue = getIssueAtPath(result, 'content.posts[0].slug');

    assert.equal(result.ok, false, `Expected ${slug} to be rejected`);
    assert.ok(issue, `Expected an issue for ${slug}`);
    assert.equal(issue.code, 'INVALID_POST_SLUG');
  }
});

test('validatePreviewData rejects unsafe category slug values', () => {
  const data = createValidPreviewData();
  data.content.categories[0].slug = '../cat';

  const result = validatePreviewData(data);
  const issue = getIssueAtPath(result, 'content.categories[0].slug');

  assert.equal(result.ok, false);
  assert.ok(issue);
  assert.equal(issue.code, 'INVALID_CATEGORY_SLUG');
});

test('validatePreviewData rejects unsafe post category_slugs entries', () => {
  const data = createValidPreviewData();
  data.content.posts[0].category_slugs = ['../cat'];

  const result = validatePreviewData(data);
  const issue = getIssueAtPath(result, 'content.posts[0].category_slugs[0]');

  assert.equal(result.ok, false);
  assert.ok(issue);
  assert.equal(issue.code, 'INVALID_POST_CATEGORY_SLUGS');
});

test('validatePreviewData rejects unsafe post tag_slugs entries', () => {
  const data = createValidPreviewData();
  data.content.posts[0].tag_slugs = ['%2e%2e'];

  const result = validatePreviewData(data);
  const issue = getIssueAtPath(result, 'content.posts[0].tag_slugs[0]');

  assert.equal(result.ok, false);
  assert.ok(issue);
  assert.equal(issue.code, 'INVALID_POST_TAG_SLUGS');
});

test('validatePreviewData rejects missing public_id', () => {
  const data = createValidPreviewData();
  delete data.content.posts[0].public_id;

  const result = validatePreviewData(data);
  assert.equal(result.ok, false);
  assert.equal(result.errors.some((issue) => issue.path === 'content.posts[0].public_id'), true);
});

test('validatePreviewData rejects missing menus', () => {
  const data = createValidPreviewData();
  delete data.menus;

  const result = validatePreviewData(data);
  assert.equal(result.ok, false);
  assert.equal(result.errors.some((issue) => issue.path === 'menus'), true);
});

test('validatePreviewData rejects missing widgets', () => {
  const data = createValidPreviewData();
  delete data.widgets;

  const result = validatePreviewData(data);
  assert.equal(result.ok, false);
  assert.equal(result.errors.some((issue) => issue.path === 'widgets'), true);
});

test('validatePreviewData accepts nested menus of arbitrary depth', () => {
  const data = createValidPreviewData();
  data.menus.docs_sidebar = {
    name: 'Docs Sidebar',
    items: [
      {
        title: 'Workers',
        url: '/workers/',
        type: 'page',
        target: '_self',
        children: [
          {
            title: 'CLI',
            url: '/workers/cli/',
            type: 'page',
            target: '_self',
            children: [
              {
                title: 'Install',
                url: '/workers/cli/install/',
                type: 'page',
                target: '_self',
                children: [],
              },
            ],
          },
        ],
      },
    ],
  };

  const result = validatePreviewData(data);
  assert.equal(result.ok, true);
});

test('validatePreviewData rejects invalid menu item target and legacy menu fields', () => {
  const data = createValidPreviewData();
  data.menus.primary.items[0].target = '_parent';
  data.menus.primary.items[0].label = 'Home';
  data.menus.primary.items[0].open_in_new_tab = false;

  const result = validatePreviewData(data);
  assert.equal(result.ok, false);
  assert.equal(result.errors.some((issue) => issue.path === 'menus.primary.items[0].target'), true);
  assert.equal(result.errors.some((issue) => issue.path === 'menus.primary.items[0].label'), true);
  assert.equal(result.errors.some((issue) => issue.path === 'menus.primary.items[0].open_in_new_tab'), true);
});

test('validatePreviewData accepts widgets with arbitrary item types and free-form settings', () => {
  const data = createValidPreviewData();
  data.widgets.sidebar.items.push({
    type: 'experimental-widget',
    title: 'Experimental',
    settings: {
      some_flag: true,
      nested: {
        value: 1,
      },
    },
  });

  const result = validatePreviewData(data);
  assert.equal(result.ok, true);
});

test('validatePreviewData rejects invalid widget item shells', () => {
  const data = createValidPreviewData();
  data.widgets.sidebar.items[0] = {
    type: '',
    title: '',
    settings: [],
    id: 'admin-only-id',
  };

  const result = validatePreviewData(data);
  assert.equal(result.ok, false);
  assert.equal(result.errors.some((issue) => issue.path === 'widgets.sidebar.items[0].type'), true);
  assert.equal(result.errors.some((issue) => issue.path === 'widgets.sidebar.items[0].title'), true);
  assert.equal(result.errors.some((issue) => issue.path === 'widgets.sidebar.items[0].settings'), true);
  assert.equal(result.errors.some((issue) => issue.path === 'widgets.sidebar.items[0].id'), true);
});

test('validatePreviewData accepts optional custom_css', () => {
  const data = createValidPreviewData();
  data.custom_css = {
    content: 'body { color: red; }',
  };

  const result = validatePreviewData(data);
  assert.equal(result.ok, true);
});

test('validatePreviewData rejects invalid custom_css payloads', () => {
  const data = createValidPreviewData();
  data.custom_css = {
    content: '',
    enabled: true,
  };

  const result = validatePreviewData(data);
  assert.equal(result.ok, false);
  assert.equal(result.errors.some((issue) => issue.path === 'custom_css.content'), true);
  assert.equal(result.errors.some((issue) => issue.path === 'custom_css.enabled'), true);
});

test('validatePreviewData rejects invalid menu_id keys', () => {
  const data = createValidPreviewData();
  data.menus['Primary Menu'] = {
    name: 'Primary Menu',
    items: [],
  };

  const result = validatePreviewData(data);
  assert.equal(result.ok, false);
  assert.equal(result.errors.some((issue) => issue.code === 'INVALID_MENU_ID'), true);
});

test('validatePreviewData rejects missing document_type on post or page', () => {
  const data = createValidPreviewData();
  delete data.content.posts[0].document_type;
  delete data.content.pages[0].document_type;

  const result = validatePreviewData(data);
  assert.equal(result.ok, false);
  assert.equal(result.errors.some((issue) => issue.path === 'content.posts[0].document_type'), true);
  assert.equal(result.errors.some((issue) => issue.path === 'content.pages[0].document_type'), true);
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
  data.content.posts[0].html = '<p>Legacy HTML</p>';
  data.content.posts[0].author_name = 'Legacy Author';
  data.content.pages[0].html = '<p>Legacy page HTML</p>';
  data.content.categories[0].postCount = 1;
  data.routes = { index: [] };

  const result = validatePreviewData(data);
  assert.equal(result.ok, false);
  assert.equal(result.errors.some((issue) => issue.path === 'site.site_name'), true);
  assert.equal(result.errors.some((issue) => issue.path === 'content.posts[0].html'), true);
  assert.equal(result.errors.some((issue) => issue.path === 'content.posts[0].author_name'), true);
  assert.equal(result.errors.some((issue) => issue.path === 'content.pages[0].html'), true);
  assert.equal(result.errors.some((issue) => issue.path === 'content.categories[0].postCount'), true);
  assert.equal(result.errors.some((issue) => issue.path === 'routes'), true);
});

test('validatePreviewData rejects posts that reference missing author ids', () => {
  const data = createValidPreviewData();
  data.content.posts[0].author_id = 'author-missing';

  const result = validatePreviewData(data);
  assert.equal(result.ok, false);
  assert.equal(result.errors.some((issue) => issue.path === 'content.posts[0].author_id'), true);
});

test('validatePreviewData rejects duplicate author ids', () => {
  const data = createValidPreviewData();
  data.content.authors.push({
    id: 'author-1',
    display_name: 'Duplicate',
  });

  const result = validatePreviewData(data);
  assert.equal(result.ok, false);
  assert.equal(result.errors.some((issue) => issue.code === 'DUPLICATE_AUTHOR_ID'), true);
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

test('validatePreviewData rejects replaced preview-data v0.5 site keys', () => {
  const data = createValidPreviewData();
  data.site.language = 'en-US';
  data.site.siteLocale = 'en-US';
  data.site.siteTimezone = 'UTC';
  data.site.media_delivery_base_url = 'https://media.example.com';

  const result = validatePreviewData(data);
  assert.equal(result.ok, false);
  assert.equal(result.errors.some((issue) => issue.path === 'site.language'), true);
  assert.equal(result.errors.some((issue) => issue.path === 'site.siteLocale'), true);
  assert.equal(result.errors.some((issue) => issue.path === 'site.siteTimezone'), true);
  assert.equal(result.errors.some((issue) => issue.path === 'site.media_delivery_base_url'), true);
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

test('validatePreviewData rejects removed id fields on pages, categories, and tags', () => {
  const data = createValidPreviewData();
  data.content.pages[0].id = 'page-1';
  data.content.categories[0].id = 'cat-1';
  data.content.tags[0].id = 'tag-1';

  const result = validatePreviewData(data);
  assert.equal(result.ok, false);
  assert.equal(result.errors.some((issue) => issue.path === 'content.pages[0].id'), true);
  assert.equal(result.errors.some((issue) => issue.path === 'content.categories[0].id'), true);
  assert.equal(result.errors.some((issue) => issue.path === 'content.tags[0].id'), true);
});

test('validatePreviewData allows relative author avatar and relative featured_image', () => {
  const data = createValidPreviewData();
  data.content.authors[0].avatar = './images/author-avatar.png';
  data.content.posts[0].featured_image = './images/post-share.png';
  data.content.pages[0].excerpt = 'Updated page summary';
  data.content.pages[0].featured_image = './images/page-share.png';

  const result = validatePreviewData(data);
  assert.equal(result.ok, true);
});

test('validatePreviewData accepts site.mediaBaseUrl', () => {
  const data = createValidPreviewData();

  const result = validatePreviewData(data);
  assert.equal(result.ok, true);
});

test('validatePreviewData allows an empty string for site.mediaBaseUrl', () => {
  const data = createValidPreviewData();
  data.site.mediaBaseUrl = '';

  const result = validatePreviewData(data);
  assert.equal(result.ok, true);
});

test('validatePreviewData rejects missing site.mediaBaseUrl', () => {
  const data = createValidPreviewData();
  delete data.site.mediaBaseUrl;

  const result = validatePreviewData(data);
  assert.equal(result.ok, false);
  assert.equal(result.errors.some((issue) => issue.path === 'site.mediaBaseUrl'), true);
});

test('validatePreviewData rejects malformed page featured_image', () => {
  const data = createValidPreviewData();
  data.content.pages[0].featured_image = '//cdn.example.com/broken.png';

  const result = validatePreviewData(data);
  assert.equal(result.ok, false);
  assert.equal(result.errors.some((issue) => issue.path === 'content.pages[0].featured_image'), true);
});

test('validatePreviewData rejects malformed relative-looking author avatar', () => {
  const data = createValidPreviewData();
  data.content.authors[0].avatar = '//cdn.example.com/broken-avatar.png';

  const result = validatePreviewData(data);
  assert.equal(result.ok, false);
  assert.equal(result.errors.some((issue) => issue.path === 'content.authors[0].avatar'), true);
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
  data.version = '0.4';

  assert.throws(() => assertPreviewData(data), /INVALID_VERSION/);
});

test('isPreviewData narrows valid payloads', () => {
  assert.equal(isPreviewData(createValidPreviewData()), true);
  assert.equal(isPreviewData({ version: PREVIEW_DATA_VERSION }), false);
});

test('published schema files are stored outside src', async () => {
  await fs.access(new URL('../schemas/preview-data.v0.2.schema.json', import.meta.url));
  await fs.access(new URL('../schemas/preview-data.v0.3.schema.json', import.meta.url));
  await fs.access(new URL('../schemas/preview-data.v0.4.schema.json', import.meta.url));
  await fs.access(new URL('../schemas/preview-data.v0.5.schema.json', import.meta.url));
});
