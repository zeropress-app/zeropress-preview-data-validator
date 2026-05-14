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
      media_base_url: 'https://media.example.com',
      locale: 'en-US',
      posts_per_page: 10,
      date_format: 'YYYY-MM-DD',
      time_format: 'HH:mm',
      timezone: 'UTC',
      disallow_comments: false,
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

test('validatePreviewData accepts a valid v0.6 payload', () => {
  const result = validatePreviewData(createValidPreviewData());
  assert.equal(result.ok, true);
  assert.equal(result.errors.length, 0);
});

test('validatePreviewData accepts optional root $schema editor hint', () => {
  const data = createValidPreviewData();
  data.$schema = 'https://zeropress.dev/schemas/preview-data.v0.6.schema.json';

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

test('validatePreviewData accepts optional permalinks and page path', () => {
  const data = createValidPreviewData();
  data.site.permalinks = {
    output_style: 'html-extension',
    posts: '/posts/:public_id',
    pages: '/:slug/',
    categories: '/categories/:slug/',
    tags: '/tags/:slug/',
  };
  data.content.pages[0].path = 'spec/preview-data-v0.6';

  const result = validatePreviewData(data);
  assert.equal(result.ok, true);
  assert.equal(result.errors.length, 0);
});

test('validatePreviewData accepts optional front page and post index settings', () => {
  const themeIndex = createValidPreviewData();
  themeIndex.site.front_page = {
    type: 'theme_index',
  };
  themeIndex.site.post_index = {
    enabled: true,
    path: '/blog/',
    paginate: false,
  };

  const pageFront = createValidPreviewData();
  pageFront.site.front_page = {
    type: 'page',
    page_slug: 'about',
  };

  const standaloneFront = createValidPreviewData();
  standaloneFront.site.front_page = {
    type: 'standalone_html',
    html: '<!doctype html><html><head><title>Launch</title></head><body>Launch</body></html>',
  };

  assert.equal(validatePreviewData(themeIndex).ok, true);
  assert.equal(validatePreviewData(pageFront).ok, true);
  assert.equal(validatePreviewData(standaloneFront).ok, true);
});

test('validatePreviewData rejects invalid front page settings', () => {
  const invalidType = createValidPreviewData();
  invalidType.site.front_page = {
    type: 'home',
  };

  const missingPageSlug = createValidPreviewData();
  missingPageSlug.site.front_page = {
    type: 'page',
  };

  const missingHtml = createValidPreviewData();
  missingHtml.site.front_page = {
    type: 'standalone_html',
  };

  const emptyHtml = createValidPreviewData();
  emptyHtml.site.front_page = {
    type: 'standalone_html',
    html: '',
  };

  assert.equal(getIssueAtPath(validatePreviewData(invalidType), 'site.front_page.type')?.code, 'INVALID_FRONT_PAGE_TYPE');
  assert.equal(getIssueAtPath(validatePreviewData(missingPageSlug), 'site.front_page.page_slug')?.code, 'INVALID_FRONT_PAGE_PAGE_SLUG');
  assert.equal(getIssueAtPath(validatePreviewData(missingHtml), 'site.front_page.html')?.code, 'INVALID_FRONT_PAGE_HTML');
  assert.equal(getIssueAtPath(validatePreviewData(emptyHtml), 'site.front_page.html')?.code, 'INVALID_FRONT_PAGE_HTML');
});

test('validatePreviewData rejects invalid post index settings', () => {
  const cases = [
    ['enabled', 'yes', 'site.post_index.enabled', 'INVALID_POST_INDEX_ENABLED'],
    ['paginate', 'no', 'site.post_index.paginate', 'INVALID_POST_INDEX_PAGINATE'],
    ['path', 'blog/', 'site.post_index.path', 'INVALID_POST_INDEX_PATH'],
    ['path', '/blog.html', 'site.post_index.path', 'INVALID_POST_INDEX_PATH'],
    ['path', '/blog?draft=true', 'site.post_index.path', 'INVALID_POST_INDEX_PATH'],
    ['path', '/blog/../posts/', 'site.post_index.path', 'INVALID_POST_INDEX_PATH'],
    ['path', '/blog//posts/', 'site.post_index.path', 'INVALID_POST_INDEX_PATH'],
  ];

  for (const [fieldName, value, issuePath, issueCode] of cases) {
    const data = createValidPreviewData();
    data.site.post_index = {
      enabled: true,
      path: '/blog/',
      paginate: true,
      [fieldName]: value,
    };

    const result = validatePreviewData(data);
    const issue = getIssueAtPath(result, issuePath);

    assert.equal(result.ok, false, `Expected ${fieldName}=${value} to be rejected`);
    assert.ok(issue, `Expected an issue at ${issuePath}`);
    assert.equal(issue.code, issueCode);
  }
});

test('validatePreviewData rejects invalid permalink settings', () => {
  const cases = [
    ['output_style', 'flat', 'site.permalinks.output_style', 'INVALID_PERMALINK_OUTPUT_STYLE'],
    ['posts', '/posts/:missing/', 'site.permalinks.posts', 'INVALID_PERMALINK_TOKEN'],
    ['posts', '/posts/post-:slug/', 'site.permalinks.posts', 'INVALID_PERMALINK_TOKEN'],
    ['posts', '/posts/:year/', 'site.permalinks.posts', 'INVALID_PERMALINK_PATTERN'],
    ['posts', '/posts/:slug.html', 'site.permalinks.posts', 'INVALID_PERMALINK_PATTERN'],
    ['pages', '/docs/:public_id/', 'site.permalinks.pages', 'INVALID_PERMALINK_TOKEN'],
    ['categories', '/categories/../:slug/', 'site.permalinks.categories', 'INVALID_PERMALINK_PATTERN'],
  ];

  for (const [fieldName, value, issuePath, issueCode] of cases) {
    const data = createValidPreviewData();
    data.site.permalinks = {
      output_style: 'directory',
      posts: '/posts/:slug/',
      pages: '/:slug/',
      categories: '/categories/:slug/',
      tags: '/tags/:slug/',
      [fieldName]: value,
    };

    const result = validatePreviewData(data);
    const issue = getIssueAtPath(result, issuePath);

    assert.equal(result.ok, false, `Expected ${fieldName}=${value} to be rejected`);
    assert.ok(issue, `Expected an issue at ${issuePath}`);
    assert.equal(issue.code, issueCode);
  }
});

test('validatePreviewData rejects invalid page path values', () => {
  const cases = ['/docs', 'docs/', 'docs//intro', 'docs/../intro', 'docs/hello world', 'docs/page.html'];

  for (const pagePath of cases) {
    const data = createValidPreviewData();
    data.content.pages[0].path = pagePath;

    const result = validatePreviewData(data);
    const issue = getIssueAtPath(result, 'content.pages[0].path');

    assert.equal(result.ok, false, `Expected ${pagePath} to be rejected`);
    assert.ok(issue, `Expected an issue for ${pagePath}`);
    assert.equal(issue.code, 'INVALID_PAGE_PATH');
  }
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

test('validatePreviewData rejects duplicate post public_id values', () => {
  const data = createValidPreviewData();
  data.content.posts.push({
    ...data.content.posts[0],
    title: 'Duplicate Public ID',
    slug: 'duplicate-public-id',
  });

  const result = validatePreviewData(data);
  const issue = getIssueAtPath(result, 'content.posts[1].public_id');

  assert.equal(result.ok, false);
  assert.ok(issue);
  assert.equal(issue.code, 'DUPLICATE_POST_PUBLIC_ID');
});

test('validatePreviewData accepts missing menus', () => {
  const data = createValidPreviewData();
  delete data.menus;

  const result = validatePreviewData(data);
  assert.equal(result.ok, true);
});

test('validatePreviewData accepts missing widgets', () => {
  const data = createValidPreviewData();
  delete data.widgets;

  const result = validatePreviewData(data);
  assert.equal(result.ok, true);
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

test('validatePreviewData accepts optional custom_html slots', () => {
  const headOnly = createValidPreviewData();
  headOnly.custom_html = {
    head_end: {
      content: '<meta name="site-verification" content="ok">\n<script async src="https://example.com/tracker.js"></script>',
    },
  };

  const bodyOnly = createValidPreviewData();
  bodyOnly.custom_html = {
    body_end: {
      content: '<script defer src="/vendor/app.js"></script>',
    },
  };

  const bothSlots = createValidPreviewData();
  bothSlots.custom_html = {
    head_end: {
      content: '</head><body data-trusted="yes"><script>window.dataLayer = window.dataLayer || [];</script>',
    },
    body_end: {
      content: '<script>window.__zp_custom = true;</script>',
    },
  };

  assert.equal(validatePreviewData(headOnly).ok, true);
  assert.equal(validatePreviewData(bodyOnly).ok, true);
  assert.equal(validatePreviewData(bothSlots).ok, true);
});

test('validatePreviewData rejects invalid custom_html payloads', () => {
  const emptyCustomHtml = createValidPreviewData();
  emptyCustomHtml.custom_html = {};
  const emptyCustomHtmlResult = validatePreviewData(emptyCustomHtml);
  assert.equal(emptyCustomHtmlResult.ok, false);
  assert.equal(emptyCustomHtmlResult.errors.some((issue) => issue.path === 'custom_html'), true);

  const invalidSlot = createValidPreviewData();
  invalidSlot.custom_html = {
    head_end: '<script></script>',
  };
  const invalidSlotResult = validatePreviewData(invalidSlot);
  assert.equal(invalidSlotResult.ok, false);
  assert.equal(invalidSlotResult.errors.some((issue) => issue.path === 'custom_html.head_end'), true);

  const invalidContent = createValidPreviewData();
  invalidContent.custom_html = {
    head_end: {
      content: '',
      enabled: true,
    },
    footer_end: {
      content: '<script></script>',
    },
  };
  const invalidContentResult = validatePreviewData(invalidContent);
  assert.equal(invalidContentResult.ok, false);
  assert.equal(invalidContentResult.errors.some((issue) => issue.path === 'custom_html.head_end.content'), true);
  assert.equal(invalidContentResult.errors.some((issue) => issue.path === 'custom_html.head_end.enabled'), true);
  assert.equal(invalidContentResult.errors.some((issue) => issue.path === 'custom_html.footer_end'), true);
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

test('validatePreviewData rejects legacy prefixed locale and timezone site keys', () => {
  const data = createValidPreviewData();
  data.site.site_timezone = 'UTC';
  data.site.site_locale = 'en_US';

  const result = validatePreviewData(data);
  assert.equal(result.ok, false);
  assert.equal(result.errors.some((issue) => issue.path === 'site.site_timezone'), true);
  assert.equal(result.errors.some((issue) => issue.path === 'site.site_locale'), true);
});

test('validatePreviewData rejects legacy site keys replaced before v0.6', () => {
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

test('validatePreviewData accepts optional scalar site meta', () => {
  const data = createValidPreviewData();
  data.site.meta = {
    issue: 'Spring 2026',
    featured_count: 4,
    show_sponsor_banner: true,
    empty_value: null,
  };

  const result = validatePreviewData(data);
  assert.equal(result.ok, true);
});

test('validatePreviewData accepts optional site indexing policy', () => {
  for (const value of [undefined, true, false]) {
    const data = createValidPreviewData();
    if (value !== undefined) {
      data.site.indexing = value;
    }

    const result = validatePreviewData(data);
    assert.equal(result.ok, true);
  }
});

test('validatePreviewData rejects non-boolean site indexing policy', () => {
  for (const value of ['false', 0]) {
    const data = createValidPreviewData();
    data.site.indexing = value;

    const result = validatePreviewData(data);
    assert.equal(result.ok, false);
    assert.equal(result.errors.some((issue) => issue.path === 'site.indexing'), true);
  }
});

test('validatePreviewData rejects extra site keys outside site.meta', () => {
  const data = createValidPreviewData();
  data.site.heroTitle = 'Hello';

  const result = validatePreviewData(data);
  assert.equal(result.ok, false);
  assert.equal(result.errors.some((issue) => issue.path === 'site.heroTitle'), true);
});

test('validatePreviewData rejects nested site meta values', () => {
  const data = createValidPreviewData();
  data.site.meta = {
    nested: { value: true },
    list: ['bad'],
  };

  const result = validatePreviewData(data);
  assert.equal(result.ok, false);
  assert.equal(result.errors.some((issue) => issue.path === 'site.meta.nested'), true);
  assert.equal(result.errors.some((issue) => issue.path === 'site.meta.list'), true);
});

test('validatePreviewData accepts optional named collections', () => {
  const data = createValidPreviewData();
  data.collections = {
    'cover-story': {
      title: 'Cover Story',
      description: 'Main feature',
      items: [
        { type: 'post', slug: 'hello-zeropress' },
        { type: 'page', slug: 'about' },
      ],
    },
    essays: {
      items: [
        { type: 'post', slug: 'hello-zeropress' },
      ],
    },
  };

  const result = validatePreviewData(data);
  assert.equal(result.ok, true);
});

test('validatePreviewData rejects invalid named collections', () => {
  const data = createValidPreviewData();
  data.collections = {
    '-bad': {
      title: '',
      items: [
        { type: 'post', slug: 'hello-zeropress' },
        { type: 'post', slug: 'hello-zeropress' },
        { type: 'category', slug: 'general', extra: true },
        { type: 'page', slug: '../bad' },
      ],
    },
  };

  const result = validatePreviewData(data);
  assert.equal(result.ok, false);
  assert.equal(result.errors.some((issue) => issue.path === 'collections.-bad'), true);
  assert.equal(result.errors.some((issue) => issue.path === 'collections.-bad.title'), true);
  assert.equal(result.errors.some((issue) => issue.path === 'collections.-bad.items[1].slug' && issue.code === 'DUPLICATE_COLLECTION_ITEM'), true);
  assert.equal(result.errors.some((issue) => issue.path === 'collections.-bad.items[2].type'), true);
  assert.equal(result.errors.some((issue) => issue.path === 'collections.-bad.items[2].extra'), true);
  assert.equal(result.errors.some((issue) => issue.path === 'collections.-bad.items[3].slug'), true);
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

test('validatePreviewData accepts site.media_base_url', () => {
  const data = createValidPreviewData();

  const result = validatePreviewData(data);
  assert.equal(result.ok, true);
});

test('validatePreviewData accepts optional site.media_delivery_mode values', () => {
  const data = createValidPreviewData();
  data.site.media_delivery_mode = 'media_domain';

  let result = validatePreviewData(data);
  assert.equal(result.ok, true);

  data.site.media_delivery_mode = 'none';
  result = validatePreviewData(data);
  assert.equal(result.ok, true);
});

test('validatePreviewData rejects invalid site.media_delivery_mode', () => {
  const data = createValidPreviewData();
  data.site.media_delivery_mode = 'cloudflare';

  const result = validatePreviewData(data);
  assert.equal(result.ok, false);
  assert.equal(getIssueAtPath(result, 'site.media_delivery_mode')?.code, 'INVALID_SITE_MEDIA_DELIVERY_MODE');
});

test('validatePreviewData accepts optional site.favicon entries', () => {
  const data = createValidPreviewData();
  data.site.favicon = {
    icon: '/favicon.ico',
    svg: './favicon.svg',
    png: 'https://cdn.example.com/favicon.png',
    apple_touch_icon: '/apple-touch-icon.png',
  };

  const result = validatePreviewData(data);
  assert.equal(result.ok, true);
});

test('validatePreviewData rejects invalid site.favicon payloads', () => {
  const emptyFavicon = createValidPreviewData();
  emptyFavicon.site.favicon = {};
  const emptyResult = validatePreviewData(emptyFavicon);
  assert.equal(emptyResult.ok, false);
  assert.equal(getIssueAtPath(emptyResult, 'site.favicon')?.code, 'INVALID_SITE_FAVICON');

  const invalidFavicon = createValidPreviewData();
  invalidFavicon.site.favicon = {
    icon: '',
    svg: '//cdn.example.com/favicon.svg',
    png: 123,
    shortcut_icon: '/shortcut.ico',
  };
  const invalidResult = validatePreviewData(invalidFavicon);
  assert.equal(invalidResult.ok, false);
  assert.equal(getIssueAtPath(invalidResult, 'site.favicon.icon')?.code, 'INVALID_SITE_FAVICON_URL');
  assert.equal(getIssueAtPath(invalidResult, 'site.favicon.svg')?.code, 'INVALID_SITE_FAVICON_URL');
  assert.equal(getIssueAtPath(invalidResult, 'site.favicon.png')?.code, 'INVALID_SITE_FAVICON_URL');
  assert.equal(invalidResult.errors.some((issue) => issue.path === 'site.favicon.shortcut_icon'), true);
});

test('validatePreviewData allows an empty string for site.media_base_url', () => {
  const data = createValidPreviewData();
  data.site.media_base_url = '';

  const result = validatePreviewData(data);
  assert.equal(result.ok, true);
});

test('validatePreviewData rejects missing site.media_base_url', () => {
  const data = createValidPreviewData();
  delete data.site.media_base_url;

  const result = validatePreviewData(data);
  assert.equal(result.ok, false);
  assert.equal(result.errors.some((issue) => issue.path === 'site.media_base_url'), true);
});

test('validatePreviewData accepts optional content.media entries', () => {
  const data = createValidPreviewData();
  data.content.media = [
    {
      src: '/originals/2026/03/published-post.png',
      width: 1600,
      height: 900,
      alt: 'Published post image',
    },
    {
      src: 'https://cdn.example.com/avatar.jpg',
      width: 512,
      height: 512,
    },
  ];

  const result = validatePreviewData(data);
  assert.equal(result.ok, true);
});

test('validatePreviewData rejects duplicate content.media src values', () => {
  const data = createValidPreviewData();
  data.content.media = [
    { src: '/images/duplicate.jpg', width: 800, height: 450 },
    { src: '/images/duplicate.jpg', width: 400, height: 225 },
  ];

  const result = validatePreviewData(data);
  assert.equal(result.ok, false);
  assert.equal(getIssueAtPath(result, 'content.media[1].src')?.code, 'DUPLICATE_MEDIA_SRC');
});

test('validatePreviewData rejects invalid content.media fields', () => {
  const data = createValidPreviewData();
  data.content.media = [
    {
      src: '//cdn.example.com/broken.jpg',
      width: 0,
      height: -1,
      alt: 123,
      id: 'legacy-media-id',
    },
  ];

  const result = validatePreviewData(data);
  assert.equal(result.ok, false);
  assert.equal(getIssueAtPath(result, 'content.media[0].src')?.code, 'INVALID_MEDIA_SRC');
  assert.equal(getIssueAtPath(result, 'content.media[0].width')?.code, 'INVALID_MEDIA_WIDTH');
  assert.equal(getIssueAtPath(result, 'content.media[0].height')?.code, 'INVALID_MEDIA_HEIGHT');
  assert.equal(getIssueAtPath(result, 'content.media[0].alt')?.code, 'INVALID_MEDIA_ALT');
  assert.equal(result.errors.some((issue) => issue.path === 'content.media[0].id'), true);
});

test('validatePreviewData accepts optional site.footer display data', () => {
  const data = createValidPreviewData();
  data.site.footer = {
    copyright_text: 'Copyright 2026 Example Corp.',
    attribution: false,
  };

  const result = validatePreviewData(data);
  assert.equal(result.ok, true);
});

test('validatePreviewData rejects invalid site.footer display data', () => {
  const data = createValidPreviewData();
  data.site.footer = {
    copyright_text: '',
    attribution: {
      enabled: 'false',
    },
    extra: true,
  };

  const result = validatePreviewData(data);
  assert.equal(result.ok, false);
  assert.equal(result.errors.some((issue) => issue.path === 'site.footer.copyright_text'), true);
  assert.equal(result.errors.some((issue) => issue.path === 'site.footer.attribution'), true);
  assert.equal(result.errors.some((issue) => issue.path === 'site.footer.extra'), true);
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
  data.version = '0.5';

  assert.throws(() => assertPreviewData(data), /INVALID_VERSION/);
});

test('isPreviewData narrows valid payloads', () => {
  assert.equal(isPreviewData(createValidPreviewData()), true);
  assert.equal(isPreviewData({ version: PREVIEW_DATA_VERSION }), false);
});

test('published schema files are stored outside src', async () => {
  await fs.access(new URL('../schemas/preview-data.v0.4.schema.json', import.meta.url));
  await fs.access(new URL('../schemas/preview-data.v0.5.schema.json', import.meta.url));
  await fs.access(new URL('../schemas/preview-data.v0.6.schema.json', import.meta.url));
});
