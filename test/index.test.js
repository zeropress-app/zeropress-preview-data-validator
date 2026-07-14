import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import {
  PREVIEW_DATA_VERSION,
  assertPreviewData,
  isPreviewData,
  validatePreviewData,
} from '../src/index.js';
import {
  ABSOLUTE_WEB_URL_PATTERN_SOURCE,
  MEDIA_ORIGIN_PATTERN_SOURCE,
  buildPreviewDataSchema,
} from '../src/contract-definitions.js';

function createValidPreviewData() {
  return {
    version: PREVIEW_DATA_VERSION,
    generator: 'zeropress-preview-data-validator-test',
    generated_at: '2026-03-26T00:00:00Z',
    site: {
      title: 'ZeroPress Preview',
      description: 'Preview contract fixture',
      url: 'https://example.com',
      media_origin: 'https://media.example.com',
      locale: 'en-US',
      posts_per_page: 10,
      date_style: 'medium',
      time_style: 'none',
      timezone: 'UTC',
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

function enableZeroPressComments(data, comments = {}) {
  data.site.comments = {
    enabled: true,
    api_base_url: '/api/comments',
    ...comments,
  };
  for (const item of [...data.content.posts, ...data.content.pages]) {
    if (item.allow_comments === true) {
      item.comments = { request_token: `request-token-${item.public_id}` };
    }
  }
  return data;
}

function getIssueAtPath(result, issuePath) {
  return result.errors.find((issue) => issue.path === issuePath);
}

function createNestedMenuItem(depth, maxDepth = 9) {
  return {
    title: `Level ${depth}`,
    url: `/level-${depth}/`,
    target: '_self',
    meta: depth === 1 ? {
      icon: 'docs',
      badge: 'New',
      accent: 'green',
      featured: true,
      order: 1,
      empty: null,
    } : undefined,
    children: depth < maxDepth ? [createNestedMenuItem(depth + 1, maxDepth)] : [],
  };
}

test('validatePreviewData accepts a valid v0.7 payload', () => {
  const result = validatePreviewData(createValidPreviewData());
  assert.equal(result.ok, true);
  assert.equal(result.errors.length, 0);
});

test('validatePreviewData accepts only preview-data version 0.7', () => {
  assert.equal(PREVIEW_DATA_VERSION, '0.7');

  for (const version of ['0.6', '0.5', '0.8', 0.7, null]) {
    const data = createValidPreviewData();
    data.version = version;
    const result = validatePreviewData(data);

    assert.equal(result.ok, false, `Expected version ${JSON.stringify(version)} to be rejected`);
    assert.equal(getIssueAtPath(result, 'version')?.code, 'INVALID_VERSION');
  }
});

test('validatePreviewData rejects inherited contract fields and non-plain objects', () => {
  const inheritedPayload = Object.create(createValidPreviewData());
  const inheritedResult = validatePreviewData(inheritedPayload);

  assert.equal(inheritedResult.ok, false);
  assert.equal(inheritedResult.errors.some((entry) => entry.path === ''), true);

  const nullPrototypePayload = Object.assign(Object.create(null), createValidPreviewData());
  assert.equal(validatePreviewData(nullPrototypePayload).ok, true);
});

test('validatePreviewData rejects sparse array holes as non-JSON values', () => {
  const sparsePosts = createValidPreviewData();
  sparsePosts.content.posts = new Array(1);
  assert.equal(validatePreviewData(sparsePosts).ok, false);

  const sparseMenuItems = createValidPreviewData();
  sparseMenuItems.menus.primary.items = new Array(1);
  assert.equal(validatePreviewData(sparseMenuItems).ok, false);

  const sparseStructuredData = createValidPreviewData();
  sparseStructuredData.content.pages[0].data = { items: new Array(1) };
  assert.equal(validatePreviewData(sparseStructuredData).ok, false);
});

test('validatePreviewData accepts supported datetime style values', () => {
  const styled = createValidPreviewData();
  styled.site.date_style = 'full';
  styled.site.time_style = 'short';

  const empty = createValidPreviewData();
  empty.site.date_style = 'none';
  empty.site.time_style = 'none';

  assert.equal(validatePreviewData(styled).ok, true);
  assert.equal(validatePreviewData(empty).ok, true);
});

test('validatePreviewData rejects invalid datetime style values', () => {
  const data = createValidPreviewData();
  data.site.date_style = 'YYYY-MM-DD';
  data.site.time_style = 'HH:mm';

  const result = validatePreviewData(data);

  assert.equal(result.ok, false);
  assert.equal(getIssueAtPath(result, 'site.date_style')?.code, 'INVALID_SITE_DATE_STYLE');
  assert.equal(getIssueAtPath(result, 'site.time_style')?.code, 'INVALID_SITE_TIME_STYLE');
});

test('validatePreviewData rejects removed site.datetime_display values', () => {
  for (const value of ['static', 'client']) {
    const data = createValidPreviewData();
    data.site.datetime_display = value;

    const result = validatePreviewData(data);

    assert.equal(result.ok, false);
    assert.equal(getIssueAtPath(result, 'site.datetime_display')?.code, 'UNKNOWN_PROPERTY');
  }
});

test('validatePreviewData rejects legacy date_format and time_format fields', () => {
  const data = createValidPreviewData();
  data.site.date_format = 'YYYY-MM-DD';
  data.site.time_format = 'HH:mm';

  const result = validatePreviewData(data);

  assert.equal(result.ok, false);
  assert.equal(getIssueAtPath(result, 'site.date_format')?.code, 'UNKNOWN_PROPERTY');
  assert.equal(getIssueAtPath(result, 'site.time_format')?.code, 'UNKNOWN_PROPERTY');
});

test('validatePreviewData accepts optional root $schema editor hint', () => {
  const data = createValidPreviewData();
  data.$schema = 'https://schemas.zeropress.dev/preview-data/v0.7/schema.json';

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

test('validatePreviewData accepts optional site newsletter settings', () => {
  const disabled = createValidPreviewData();
  disabled.site.newsletter = {
    enabled: false,
  };

  const signupOnly = createValidPreviewData();
  signupOnly.site.newsletter = {
    enabled: true,
    signup_url: 'https://example.com/newsletter',
  };

  const embedOnly = createValidPreviewData();
  embedOnly.site.newsletter = {
    enabled: true,
    embed_url: '/newsletter.html',
  };

  const full = createValidPreviewData();
  full.site.newsletter = {
    enabled: true,
    title: 'Subscribe',
    description: 'Get updates by email.',
    button_label: 'Subscribe',
    signup_url: 'https://example.com/newsletter',
    embed_url: '/newsletter.html',
  };

  for (const data of [disabled, signupOnly, embedOnly, full]) {
    const result = validatePreviewData(data);
    assert.equal(result.ok, true);
    assert.equal(result.errors.length, 0);
  }
});

test('validatePreviewData rejects invalid site newsletter settings', () => {
  const cases = [
    [{}, 'site.newsletter.enabled', 'MISSING_REQUIRED_PROPERTY'],
    [{ enabled: true }, 'site.newsletter', 'INVALID_SITE_NEWSLETTER_URL'],
    [{ enabled: true, signup_url: '' }, 'site.newsletter.signup_url', 'INVALID_SITE_NEWSLETTER_SIGNUP_URL'],
    [{ enabled: true, signup_url: '/newsletter form.html' }, 'site.newsletter.signup_url', 'INVALID_SITE_NEWSLETTER_SIGNUP_URL'],
    [{ enabled: true, embed_url: '//example.com/newsletter.html' }, 'site.newsletter.embed_url', 'INVALID_SITE_NEWSLETTER_EMBED_URL'],
    [{ enabled: true, signup_url: 'javascript:alert(1)' }, 'site.newsletter.signup_url', 'INVALID_SITE_NEWSLETTER_SIGNUP_URL'],
    [{ enabled: true, signup_url: 'ftp://example.com/newsletter' }, 'site.newsletter.signup_url', 'INVALID_SITE_NEWSLETTER_SIGNUP_URL'],
    [{ enabled: true, signup_url: '/newsletter.html', title: 42 }, 'site.newsletter.title', 'INVALID_SITE_NEWSLETTER_TITLE'],
    [{ enabled: true, signup_url: '/newsletter.html', mode: 'popup' }, 'site.newsletter.mode', 'UNKNOWN_PROPERTY'],
  ];

  for (const [newsletter, issuePath, issueCode] of cases) {
    const data = createValidPreviewData();
    data.site.newsletter = newsletter;

    const result = validatePreviewData(data);
    const issue = getIssueAtPath(result, issuePath);

    assert.equal(result.ok, false, `Expected newsletter=${JSON.stringify(newsletter)} to be rejected`);
    assert.ok(issue, `Expected an issue at ${issuePath}`);
    assert.equal(issue.code, issueCode);
  }
});

test('validatePreviewData accepts optional site comment provider settings and boundaries', () => {
  const cases = [
    { enabled: false, api_base_url: '/' },
    { enabled: true, api_base_url: '/api/comments', provider: 'zeropress', per_page: 1, order: 'asc', threading: { enabled: false, max_depth: 2 } },
    { enabled: true, api_base_url: 'HTTPS://comments.example.com/api/', provider: 'wordpress', per_page: 100, order: 'desc', threading: { enabled: true, max_depth: 10 } },
    { enabled: false, api_base_url: '/api/%63omments', provider: 'wordpress', threading: {} },
  ];

  for (const comments of cases) {
    const data = createValidPreviewData();
    if (comments.provider === 'wordpress') {
      data.site.comments = comments;
    } else {
      enableZeroPressComments(data, comments);
    }

    const result = validatePreviewData(data);
    assert.equal(result.ok, true, `Expected comments=${JSON.stringify(comments)} to be accepted`);
    assert.equal(result.errors.length, 0);
  }
});

test('assertPreviewData does not materialize comment provider defaults', () => {
  const data = enableZeroPressComments(createValidPreviewData());
  const commentsBefore = structuredClone(data.site.comments);
  const result = assertPreviewData(data);

  assert.equal(result, data);
  assert.deepEqual(data.site.comments, commentsBefore);
  assert.deepEqual(data.site.comments, { enabled: true, api_base_url: '/api/comments' });
});

test('validatePreviewData rejects invalid site comment provider settings', () => {
  const validComments = (overrides = {}) => ({
    enabled: true,
    api_base_url: '/api/comments',
    ...overrides,
  });
  const cases = [
    [{}, 'site.comments.enabled', 'MISSING_REQUIRED_PROPERTY'],
    [{ enabled: true }, 'site.comments.api_base_url', 'MISSING_REQUIRED_PROPERTY'],
    [{ api_base_url: '/api/comments' }, 'site.comments.enabled', 'MISSING_REQUIRED_PROPERTY'],
    [null, 'site.comments', 'INVALID_OBJECT'],
    [validComments({ enabled: 'yes' }), 'site.comments.enabled', 'INVALID_SITE_COMMENTS_ENABLED'],
    [validComments({ api_base_url: '' }), 'site.comments.api_base_url', 'INVALID_SITE_COMMENTS_API_BASE_URL'],
    [validComments({ api_base_url: 42 }), 'site.comments.api_base_url', 'INVALID_SITE_COMMENTS_API_BASE_URL'],
    [validComments({ api_base_url: 'comments.example.com' }), 'site.comments.api_base_url', 'INVALID_SITE_COMMENTS_API_BASE_URL'],
    [validComments({ api_base_url: '//comments.example.com/api' }), 'site.comments.api_base_url', 'INVALID_SITE_COMMENTS_API_BASE_URL'],
    [validComments({ api_base_url: 'ftp://comments.example.com/api' }), 'site.comments.api_base_url', 'INVALID_SITE_COMMENTS_API_BASE_URL'],
    [validComments({ api_base_url: 'https://user:secret@comments.example.com/api' }), 'site.comments.api_base_url', 'INVALID_SITE_COMMENTS_API_BASE_URL'],
    [validComments({ api_base_url: 'https://comments.example.com/api?tenant=1' }), 'site.comments.api_base_url', 'INVALID_SITE_COMMENTS_API_BASE_URL'],
    [validComments({ api_base_url: 'https://comments.example.com/api#comments' }), 'site.comments.api_base_url', 'INVALID_SITE_COMMENTS_API_BASE_URL'],
    [validComments({ api_base_url: '/api/comments?tenant=1' }), 'site.comments.api_base_url', 'INVALID_SITE_COMMENTS_API_BASE_URL'],
    [validComments({ api_base_url: '/api/comments#comments' }), 'site.comments.api_base_url', 'INVALID_SITE_COMMENTS_API_BASE_URL'],
    [validComments({ api_base_url: '/api/comment%zz' }), 'site.comments.api_base_url', 'INVALID_SITE_COMMENTS_API_BASE_URL'],
    [validComments({ api_base_url: '/api/../comments' }), 'site.comments.api_base_url', 'INVALID_SITE_COMMENTS_API_BASE_URL'],
    [validComments({ api_base_url: '/api/comment path' }), 'site.comments.api_base_url', 'INVALID_SITE_COMMENTS_API_BASE_URL'],
    [validComments({ api_base_url: '/api\\comments' }), 'site.comments.api_base_url', 'INVALID_SITE_COMMENTS_API_BASE_URL'],
    [validComments({ api_base_url: 'https://comments.example.com:65536/api' }), 'site.comments.api_base_url', 'INVALID_SITE_COMMENTS_API_BASE_URL'],
    [validComments({ provider: 'custom' }), 'site.comments.provider', 'INVALID_SITE_COMMENTS_PROVIDER'],
    [validComments({ per_page: 0 }), 'site.comments.per_page', 'INVALID_SITE_COMMENTS_PER_PAGE'],
    [validComments({ per_page: 1.5 }), 'site.comments.per_page', 'INVALID_SITE_COMMENTS_PER_PAGE'],
    [validComments({ per_page: 101 }), 'site.comments.per_page', 'INVALID_SITE_COMMENTS_PER_PAGE'],
    [validComments({ order: 'newest' }), 'site.comments.order', 'INVALID_SITE_COMMENTS_ORDER'],
    [validComments({ threading: { enabled: 'yes' } }), 'site.comments.threading.enabled', 'INVALID_SITE_COMMENTS_THREADING_ENABLED'],
    [validComments({ threading: { max_depth: 1 } }), 'site.comments.threading.max_depth', 'INVALID_SITE_COMMENTS_THREADING_MAX_DEPTH'],
    [validComments({ threading: { max_depth: 11 } }), 'site.comments.threading.max_depth', 'INVALID_SITE_COMMENTS_THREADING_MAX_DEPTH'],
    [validComments({ threading: null }), 'site.comments.threading', 'INVALID_OBJECT'],
    [validComments({ threading: { mode: 'tree' } }), 'site.comments.threading.mode', 'UNKNOWN_PROPERTY'],
    [validComments({ cache: true }), 'site.comments.cache', 'UNKNOWN_PROPERTY'],
  ];

  for (const [comments, issuePath, issueCode] of cases) {
    const data = createValidPreviewData();
    data.site.comments = comments;

    const result = validatePreviewData(data);
    const issue = getIssueAtPath(result, issuePath);

    assert.equal(result.ok, false, `Expected comments=${JSON.stringify(comments)} to be rejected`);
    assert.ok(issue, `Expected an issue at ${issuePath}`);
    assert.equal(issue.code, issueCode);
  }
});

test('validatePreviewData requires request tokens only for effective ZeroPress comments', () => {
  const zeroPress = enableZeroPressComments(createValidPreviewData());
  assert.equal(validatePreviewData(zeroPress).ok, true);

  const maximumLength = enableZeroPressComments(createValidPreviewData());
  maximumLength.content.posts[0].comments.request_token = '😀'.repeat(512);
  assert.equal(validatePreviewData(maximumLength).ok, true);

  const tooLong = enableZeroPressComments(createValidPreviewData());
  tooLong.content.posts[0].comments.request_token = '😀'.repeat(513);
  assert.equal(getIssueAtPath(validatePreviewData(tooLong), 'content.posts[0].comments.request_token')?.code, 'INVALID_COMMENT_REQUEST_TOKEN');

  const missing = createValidPreviewData();
  missing.site.comments = { enabled: true, api_base_url: '/api/comments' };
  assert.equal(getIssueAtPath(validatePreviewData(missing), 'content.posts[0].comments')?.code, 'MISSING_REQUIRED_PROPERTY');

  const blank = enableZeroPressComments(createValidPreviewData());
  blank.content.posts[0].comments.request_token = '   ';
  assert.equal(getIssueAtPath(validatePreviewData(blank), 'content.posts[0].comments.request_token')?.code, 'INVALID_COMMENT_REQUEST_TOKEN');

  const nonString = enableZeroPressComments(createValidPreviewData());
  nonString.content.posts[0].comments.request_token = 42;
  assert.equal(getIssueAtPath(validatePreviewData(nonString), 'content.posts[0].comments.request_token')?.code, 'INVALID_COMMENT_REQUEST_TOKEN');

  const malformedObject = enableZeroPressComments(createValidPreviewData());
  malformedObject.content.posts[0].comments = null;
  assert.equal(getIssueAtPath(validatePreviewData(malformedObject), 'content.posts[0].comments')?.code, 'INVALID_OBJECT');

  const unknown = enableZeroPressComments(createValidPreviewData());
  unknown.content.posts[0].comments.extra = true;
  assert.equal(getIssueAtPath(validatePreviewData(unknown), 'content.posts[0].comments.extra')?.code, 'UNKNOWN_PROPERTY');

  const wordpress = createValidPreviewData();
  wordpress.site.comments = { enabled: true, api_base_url: '/wp-json/wp/v2', provider: 'wordpress' };
  assert.equal(validatePreviewData(wordpress).ok, true);
  wordpress.content.posts[0].comments = { request_token: 'unused-token' };
  assert.equal(validatePreviewData(wordpress).ok, true);
  wordpress.content.posts[0].comments.request_token = '   ';
  assert.equal(getIssueAtPath(validatePreviewData(wordpress), 'content.posts[0].comments.request_token')?.code, 'INVALID_COMMENT_REQUEST_TOKEN');

  const globallyDisabled = enableZeroPressComments(createValidPreviewData());
  globallyDisabled.site.comments.enabled = false;
  delete globallyDisabled.content.posts[0].comments;
  assert.equal(validatePreviewData(globallyDisabled).ok, true);
  globallyDisabled.content.posts[0].comments = { request_token: 'stale-token' };
  assert.equal(validatePreviewData(globallyDisabled).ok, true);

  const itemDisabled = enableZeroPressComments(createValidPreviewData());
  itemDisabled.content.posts[0].allow_comments = false;
  delete itemDisabled.content.posts[0].comments;
  assert.equal(validatePreviewData(itemDisabled).ok, true);
  itemDisabled.content.posts[0].comments = { request_token: 'stale-token' };
  assert.equal(validatePreviewData(itemDisabled).ok, true);

  const noProvider = createValidPreviewData();
  noProvider.content.posts[0].comments = { request_token: 'orphan-token' };
  assert.equal(validatePreviewData(noProvider).ok, true);
});

test('validatePreviewData validates page comment identity and provider metadata', () => {
  const defaultPage = createValidPreviewData();
  assert.equal(validatePreviewData(defaultPage).ok, true, 'Page comment fields remain optional and absent means disabled');

  const wordpressPage = createValidPreviewData();
  wordpressPage.site.comments = { enabled: true, api_base_url: '/wp-json/wp/v2', provider: 'wordpress' };
  wordpressPage.content.pages[0].public_id = 201;
  wordpressPage.content.pages[0].allow_comments = true;
  wordpressPage.content.pages[0].comments = { request_token: 'unused-page-token' };
  assert.equal(validatePreviewData(wordpressPage).ok, true);

  const missingId = createValidPreviewData();
  missingId.content.pages[0].allow_comments = true;
  assert.equal(getIssueAtPath(validatePreviewData(missingId), 'content.pages[0].public_id')?.code, 'MISSING_REQUIRED_PROPERTY');

  const invalidId = createValidPreviewData();
  invalidId.content.pages[0].public_id = 0;
  assert.equal(getIssueAtPath(validatePreviewData(invalidId), 'content.pages[0].public_id')?.code, 'INVALID_PAGE_PUBLIC_ID');

  const fractionalId = createValidPreviewData();
  fractionalId.content.pages[0].public_id = 1.5;
  assert.equal(getIssueAtPath(validatePreviewData(fractionalId), 'content.pages[0].public_id')?.code, 'INVALID_PAGE_PUBLIC_ID');

  const invalidAllowComments = createValidPreviewData();
  invalidAllowComments.content.pages[0].allow_comments = 'yes';
  assert.equal(getIssueAtPath(validatePreviewData(invalidAllowComments), 'content.pages[0].allow_comments')?.code, 'INVALID_PAGE_ALLOW_COMMENTS');

  const zeroPressPage = createValidPreviewData();
  zeroPressPage.content.pages[0].public_id = 201;
  zeroPressPage.content.pages[0].allow_comments = true;
  enableZeroPressComments(zeroPressPage);
  assert.equal(validatePreviewData(zeroPressPage).ok, true);
  delete zeroPressPage.content.pages[0].comments;
  assert.equal(getIssueAtPath(validatePreviewData(zeroPressPage), 'content.pages[0].comments')?.code, 'MISSING_REQUIRED_PROPERTY');
});

test('validatePreviewData enforces page public_id uniqueness without a cross-type namespace', () => {
  const duplicate = createValidPreviewData();
  duplicate.content.pages = [
    { ...duplicate.content.pages[0], public_id: 201 },
    { ...duplicate.content.pages[0], title: 'Contact', slug: 'contact', public_id: 201 },
  ];
  assert.equal(getIssueAtPath(validatePreviewData(duplicate), 'content.pages[1].public_id')?.code, 'DUPLICATE_PAGE_PUBLIC_ID');

  const crossType = createValidPreviewData();
  crossType.content.pages[0].public_id = crossType.content.posts[0].public_id;
  assert.equal(validatePreviewData(crossType).ok, true);
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

test('validatePreviewData accepts structured data on posts and pages', () => {
  const data = createValidPreviewData();
  data.content.posts[0].data = {
    eyebrow: 'Selected Work',
    stack: ['ZeroPress', 'Cloudflare'],
    facts: [
      { label: 'Role', value: 'Design Engineering' },
      { label: 'Year', value: 2026 },
    ],
    flags: {
      featured: true,
      hidden: false,
      empty: null,
    },
  };
  data.content.pages[0].data = {
    swatches: [
      { name: 'Ink', value: '#111111' },
      { name: 'Paper', value: '#ffffff' },
    ],
  };

  const result = validatePreviewData(data);
  assert.equal(result.ok, true);
  assert.equal(result.errors.length, 0);
});

test('validatePreviewData accepts optional post and page discoverability policies', () => {
  for (const discoverability of ['default', 'noindex', 'delist']) {
    const data = createValidPreviewData();
    data.content.posts[0].discoverability = discoverability;
    data.content.pages[0].discoverability = discoverability;

    const result = validatePreviewData(data);
    assert.equal(result.ok, true);
    assert.equal(result.errors.length, 0);
  }
});

test('validatePreviewData rejects invalid post and page discoverability policies', () => {
  const data = createValidPreviewData();
  data.content.posts[0].discoverability = 'private';
  data.content.pages[0].discoverability = false;

  const result = validatePreviewData(data);
  assert.equal(result.ok, false);
  assert.equal(result.errors.some((issue) => issue.path === 'content.posts[0].discoverability'), true);
  assert.equal(result.errors.some((issue) => issue.path === 'content.pages[0].discoverability'), true);
});

test('validatePreviewData accepts optional page updated_at_iso', () => {
  const data = createValidPreviewData();
  data.content.pages[0].updated_at_iso = '2026-05-27T11:20:30+09:00';

  const result = validatePreviewData(data);
  assert.equal(result.ok, true);
  assert.equal(result.errors.length, 0);
});

test('validatePreviewData rejects invalid page updated_at_iso', () => {
  const data = createValidPreviewData();
  data.content.pages[0].updated_at_iso = 'yesterday';

  const result = validatePreviewData(data);
  const issue = getIssueAtPath(result, 'content.pages[0].updated_at_iso');
  assert.equal(result.ok, false);
  assert.ok(issue);
  assert.equal(issue.code, 'INVALID_PAGE_UPDATED_AT_ISO');
});

test('validatePreviewData accepts supported RFC 3339 date-time forms', () => {
  const values = [
    '2026-03-25T09:00:00Z',
    '2026-03-25t09:00:00z',
    '2024-02-29T23:59:60Z',
    '2026-03-25T09:00:00.123456+09:30',
    '2026-03-25T09:00:00-00:00',
  ];

  for (const value of values) {
    const data = createValidPreviewData();
    data.generated_at = value;
    data.content.posts[0].published_at_iso = value;
    data.content.posts[0].updated_at_iso = value;
    data.content.pages[0].updated_at_iso = value;
    assert.equal(validatePreviewData(data).ok, true, `Expected ${value} to be accepted`);
  }
});

test('validatePreviewData rejects structurally or calendrically invalid RFC 3339 values', () => {
  const values = [
    '2026-03-25',
    '2026-03-25T09:00:00',
    '2026-02-30T09:00:00Z',
    '2025-02-29T09:00:00Z',
    '2026-03-25T24:00:00Z',
    '2026-03-25T09:60:00Z',
    '2026-03-25T09:00:61Z',
    '2026-03-25T09:00:00+24:00',
    ' 2026-03-25T09:00:00Z',
  ];

  for (const value of values) {
    const data = createValidPreviewData();
    data.generated_at = value;
    const result = validatePreviewData(data);
    assert.equal(result.ok, false, `Expected ${value} to be rejected`);
    assert.equal(getIssueAtPath(result, 'generated_at')?.code, 'INVALID_GENERATED_AT');
  }
});

test('validatePreviewData rejects invalid structured data shapes', () => {
  {
    const data = createValidPreviewData();
    data.content.posts[0].data = 'hello';
    data.content.pages[0].data = ['docs'];
    const result = validatePreviewData(data);
    assert.equal(result.ok, false);
    assert.equal(result.errors.some((issue) => issue.path === 'content.posts[0].data'), true);
    assert.equal(result.errors.some((issue) => issue.path === 'content.pages[0].data'), true);
  }

  {
    const data = createValidPreviewData();
    data.content.pages[0].data = {
      'bad.key': true,
      'bad--key': true,
      too_deep: { a: { b: { c: { d: { e: true } } } } },
      too_many: Object.fromEntries(Array.from({ length: 65 }, (_, index) => [`key_${index}`, index])),
      too_long: Array.from({ length: 257 }, (_, index) => index),
      infinite: Infinity,
      unsupported: undefined,
    };
    const result = validatePreviewData(data);
    assert.equal(result.ok, false);
    assert.equal(result.errors.some((issue) => issue.path === 'content.pages[0].data.bad.key'), true);
    assert.equal(result.errors.some((issue) => issue.path === 'content.pages[0].data.bad--key'), true);
    assert.equal(result.errors.some((issue) => issue.code === 'INVALID_DATA_DEPTH'), true);
    assert.equal(result.errors.some((issue) => issue.code === 'INVALID_DATA_OBJECT_SIZE'), true);
    assert.equal(result.errors.some((issue) => issue.code === 'INVALID_DATA_ARRAY_SIZE'), true);
    assert.equal(result.errors.some((issue) => issue.path === 'content.pages[0].data.infinite'), true);
    assert.equal(result.errors.some((issue) => issue.path === 'content.pages[0].data.unsupported'), true);
  }
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
  data.content.pages[0].path = 'spec/preview-data-v0.7';

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
    page_path: 'about',
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

  const missingPagePath = createValidPreviewData();
  missingPagePath.site.front_page = {
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
  assert.equal(getIssueAtPath(validatePreviewData(missingPagePath), 'site.front_page.page_path')?.code, 'INVALID_FRONT_PAGE_PAGE_PATH');
  assert.equal(getIssueAtPath(validatePreviewData(missingHtml), 'site.front_page.html')?.code, 'INVALID_FRONT_PAGE_HTML');
  assert.equal(getIssueAtPath(validatePreviewData(emptyHtml), 'site.front_page.html')?.code, 'INVALID_FRONT_PAGE_HTML');
});

test('validatePreviewData rejects invalid post index settings', () => {
  const cases = [
    ['enabled', 'yes', 'site.post_index.enabled', 'INVALID_POST_INDEX_ENABLED'],
    ['paginate', 'no', 'site.post_index.paginate', 'INVALID_POST_INDEX_PAGINATE'],
    ['path', 'blog/', 'site.post_index.path', 'INVALID_POST_INDEX_PATH'],
    ['path', '/blog.html', 'site.post_index.path', 'INVALID_POST_INDEX_PATH'],
    ['path', '/blog.html/archive/', 'site.post_index.path', 'INVALID_POST_INDEX_PATH'],
    ['path', '/blog?draft=true', 'site.post_index.path', 'INVALID_POST_INDEX_PATH'],
    ['path', '/blog/../posts/', 'site.post_index.path', 'INVALID_POST_INDEX_PATH'],
    ['path', '/blog//posts/', 'site.post_index.path', 'INVALID_POST_INDEX_PATH'],
    ['path', '//news', 'site.post_index.path', 'INVALID_POST_INDEX_PATH'],
    ['path', '///', 'site.post_index.path', 'INVALID_POST_INDEX_PATH'],
    ['path', '/news!', 'site.post_index.path', 'INVALID_POST_INDEX_PATH'],
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
    ['posts', '/docs/page.html/:slug/', 'site.permalinks.posts', 'INVALID_PERMALINK_PATTERN'],
    ['posts', '//:slug/', 'site.permalinks.posts', 'INVALID_PERMALINK_PATTERN'],
    ['posts', '/posts/:slug//', 'site.permalinks.posts', 'INVALID_PERMALINK_PATTERN'],
    ['posts', `/posts/${'a'.repeat(201)}/:slug`, 'site.permalinks.posts', 'INVALID_PERMALINK_PATTERN'],
    ['pages', '/docs/:public_id/', 'site.permalinks.pages', 'INVALID_PERMALINK_TOKEN'],
    ['categories', '/categories/../:slug/', 'site.permalinks.categories', 'INVALID_PERMALINK_PATTERN'],
    ['categories', '/categories/.hidden/:slug/', 'site.permalinks.categories', 'INVALID_PERMALINK_PATTERN'],
    ['categories', '/categories/version./:slug/', 'site.permalinks.categories', 'INVALID_PERMALINK_PATTERN'],
    ['categories', '/categories/v0..7/:slug/', 'site.permalinks.categories', 'INVALID_PERMALINK_PATTERN'],
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
  const cases = ['/docs', 'docs/', 'docs//intro', 'docs/../intro', 'docs/.hidden', 'docs/version.', 'docs/v0..7', 'docs/hello world', 'docs/page.html', 'docs/news!', `docs/${'a'.repeat(201)}`];

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

test('validatePreviewData uses effective Page paths as identity and allows duplicate leaf slugs', () => {
  const data = createValidPreviewData();
  data.content.pages = [
    { ...data.content.pages[0], path: 'company/about' },
    { ...data.content.pages[0], title: 'Product About', path: 'product/about' },
  ];
  data.site.front_page = { type: 'page', page_path: 'product/about' };
  data.collections = {
    featured: { items: [{ type: 'page', path: 'company/about' }] },
  };

  assert.equal(validatePreviewData(data).ok, true);

  data.content.pages[1].path = 'company/about';
  const duplicate = validatePreviewData(data);
  assert.equal(duplicate.ok, false);
  assert.equal(getIssueAtPath(duplicate, 'content.pages[1].path')?.code, 'DUPLICATE_PAGE_PATH');
});

test('validatePreviewData derives Page identity from the effective pages permalink', () => {
  const data = createValidPreviewData();
  data.site.permalinks = { pages: '/docs/:slug/' };
  data.site.front_page = { type: 'page', page_path: 'docs/about' };
  data.collections = {
    featured: { items: [{ type: 'page', path: 'docs/about' }] },
  };

  assert.equal(validatePreviewData(data).ok, true);
});

test('validatePreviewData rejects missing content references and normalized identity duplicates', () => {
  const missing = createValidPreviewData();
  missing.site.front_page = { type: 'page', page_path: 'missing' };
  missing.collections = {
    featured: {
      items: [
        { type: 'post', slug: 'missing' },
        { type: 'page', path: 'missing' },
      ],
    },
  };
  const missingResult = validatePreviewData(missing);
  assert.equal(getIssueAtPath(missingResult, 'site.front_page.page_path')?.code, 'INVALID_FRONT_PAGE_PAGE_REFERENCE');
  assert.equal(getIssueAtPath(missingResult, 'collections.featured.items[0].slug')?.code, 'INVALID_COLLECTION_ITEM_REFERENCE');
  assert.equal(getIssueAtPath(missingResult, 'collections.featured.items[1].path')?.code, 'INVALID_COLLECTION_ITEM_REFERENCE');

  const duplicatePosts = createValidPreviewData();
  duplicatePosts.content.posts.push({
    ...duplicatePosts.content.posts[0],
    public_id: 102,
    slug: 'cafe\u0301',
  });
  duplicatePosts.content.posts[0].slug = 'café';
  const duplicateResult = validatePreviewData(duplicatePosts);
  assert.equal(getIssueAtPath(duplicateResult, 'content.posts[1].slug')?.code, 'DUPLICATE_POST_SLUG');
});

test('validatePreviewData rejects mixed front-page and collection union branches', () => {
  const front = createValidPreviewData();
  front.site.front_page = { type: 'page', page_path: 'about', html: '<p>mixed</p>' };
  assert.equal(getIssueAtPath(validatePreviewData(front), 'site.front_page.html')?.code, 'INVALID_FRONT_PAGE_SHAPE');

  const collection = createValidPreviewData();
  collection.collections = {
    mixed: {
      items: [
        { type: 'post', slug: 'hello-zeropress', path: 'about' },
        { type: 'page', path: 'about', slug: 'about' },
      ],
    },
  };
  const collectionResult = validatePreviewData(collection);
  assert.equal(getIssueAtPath(collectionResult, 'collections.mixed.items[0].path')?.code, 'INVALID_COLLECTION_ITEM_SHAPE');
  assert.equal(getIssueAtPath(collectionResult, 'collections.mixed.items[1].slug')?.code, 'INVALID_COLLECTION_ITEM_SHAPE');
});

test('validatePreviewData keeps the literal .html route restriction case-sensitive', () => {
  const data = createValidPreviewData();
  data.content.pages[0].path = 'docs/page.HTML';
  data.site.post_index = { path: '/blog.HTML/' };
  data.site.permalinks = {
    posts: '/docs/page.HTML/:slug/',
    pages: '/:slug/',
    categories: '/categories/:slug/',
    tags: '/tags/:slug/',
  };

  assert.equal(validatePreviewData(data).ok, true);
});

test('validatePreviewData accepts posts without internal id', () => {
  const data = createValidPreviewData();
  const result = validatePreviewData(data);
  assert.equal(result.ok, true);
  assert.equal(result.errors.some((issue) => issue.path === 'content.posts[0].id'), false);
});

test('validatePreviewData rejects removed post internal ids as unknown properties', () => {
  const data = createValidPreviewData();
  data.content.posts[0].id = 'post-internal-1';

  const result = validatePreviewData(data);
  assert.equal(result.ok, false);
  assert.equal(getIssueAtPath(result, 'content.posts[0].id')?.code, 'UNKNOWN_PROPERTY');
});

test('validatePreviewData requires canonical BCP 47 locales', () => {
  for (const locale of ['e', '한국', '😀', 'en-us', 'EN', 'en_US', ' en-US']) {
    const data = createValidPreviewData();
    data.site.locale = locale;
    assert.equal(validatePreviewData(data).ok, false, `Expected locale ${locale} to be rejected`);
  }

  for (const locale of ['en', 'en-US', 'ko-KR', 'zh-Hant']) {
    const data = createValidPreviewData();
    data.site.locale = locale;
    assert.equal(validatePreviewData(data).ok, true, `Expected locale ${locale} to be accepted`);
  }
});

test('validatePreviewData requires canonical IANA or bounded fixed-offset timezones', () => {
  for (const timezone of ['UTC', 'Asia/Seoul', 'America/New_York', '+09:00', '-14:00', '+14:00']) {
    const data = createValidPreviewData();
    data.site.timezone = timezone;
    assert.equal(validatePreviewData(data).ok, true, `Expected timezone ${timezone} to be accepted`);
  }

  for (const timezone of ['GMT', 'utc', '+00:00', '-00:00', '+14:01', '-15:00', '+9:00', 'Asia/Kolkata', 'Not/A_Zone']) {
    const data = createValidPreviewData();
    data.site.timezone = timezone;
    assert.equal(validatePreviewData(data).ok, false, `Expected timezone ${timezone} to be rejected`);
    assert.equal(getIssueAtPath(validatePreviewData(data), 'site.timezone')?.code, 'INVALID_SITE_TIMEZONE');
  }
});

test('validatePreviewData keeps front page branches strictly discriminated', () => {
  for (const type of ['theme_index', 'page']) {
    const data = createValidPreviewData();
    data.site.front_page = {
      type,
      ...(type === 'page' ? { page_path: 'about' } : {}),
      html: '   ',
    };
    const result = validatePreviewData(data);
    assert.equal(result.ok, false);
    assert.equal(getIssueAtPath(result, 'site.front_page.html')?.code, 'INVALID_FRONT_PAGE_SHAPE');
  }
});

test('validatePreviewData accepts the Unicode slug allowlist across slug-bearing fields', () => {
  const values = ['News_2026', 'theme-runtime-v0.6', '회사소개', '中文', 'café', 'cafe\u0301', 'हिन्दी'];

  for (const value of values) {
    const data = createValidPreviewData();
    data.content.posts[0].slug = value;
    data.content.pages[0].slug = value;
    data.content.categories[0].slug = value;
    data.content.tags[0].slug = value;
    data.content.posts[0].category_slugs = [value];
    data.content.posts[0].tag_slugs = [value];
    data.site.front_page = { type: 'page', page_path: value };
    data.collections = { featured: { items: [{ type: 'post', slug: value }] } };
    assert.equal(validatePreviewData(data).ok, true, `Expected slug ${value} to be accepted`);
  }
});

test('validatePreviewData measures slug and literal path segments after NFC normalization', () => {
  const decomposed = 'e\u0301'.repeat(101);
  const data = createValidPreviewData();
  data.content.posts[0].slug = decomposed;
  data.content.pages[0].path = `docs/${decomposed}`;
  data.site.post_index = { path: `/${decomposed}/` };
  data.site.permalinks = {
    posts: `/${decomposed}/:slug/`,
    pages: '/:slug/',
    categories: '/categories/:slug/',
    tags: '/tags/:slug/',
  };

  const result = validatePreviewData(data);
  assert.equal(result.ok, true);

  const overlong = createValidPreviewData();
  overlong.content.posts[0].slug = 'a'.repeat(201);
  assert.equal(validatePreviewData(overlong).ok, false);
});

test('validatePreviewData rejects punctuation, invisible characters, emoji, and overlong slugs', () => {
  const values = ['news!', '.hidden', 'version.', 'v0..7', '😀', 'news\u200B', 'news\u202E', '---', '_-_', 'a'.repeat(201)];

  for (const value of values) {
    const data = createValidPreviewData();
    data.content.posts[0].slug = value;
    const result = validatePreviewData(data);
    assert.equal(result.ok, false, `Expected slug ${JSON.stringify(value)} to be rejected`);
    assert.equal(getIssueAtPath(result, 'content.posts[0].slug')?.code, 'INVALID_POST_SLUG');
  }
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

test('validatePreviewData preserves ordered tag_slugs and rejects duplicate normalized values', () => {
  const ordered = createValidPreviewData();
  ordered.content.tags.push({ name: 'Important', slug: 'important' });
  ordered.content.posts[0].tag_slugs = ['important', 'intro'];

  assert.equal(validatePreviewData(ordered).ok, true);
  assert.deepEqual(ordered.content.posts[0].tag_slugs, ['important', 'intro']);

  const duplicate = createValidPreviewData();
  duplicate.content.tags[0].slug = 'café';
  duplicate.content.posts[0].tag_slugs = ['café', 'cafe\u0301'];

  const result = validatePreviewData(duplicate);
  const issue = getIssueAtPath(result, 'content.posts[0].tag_slugs[1]');

  assert.equal(result.ok, false);
  assert.ok(issue);
  assert.equal(issue.code, 'DUPLICATE_POST_TAG_SLUG');
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

test('validatePreviewData accepts nested menus and scalar menu item meta', () => {
  const data = createValidPreviewData();
  data.menus.docs_sidebar = {
    name: 'Docs Sidebar',
    items: [createNestedMenuItem(1)],
  };

  const result = validatePreviewData(data);
  assert.equal(result.ok, true);
});

test('validatePreviewData rejects removed menu item type', () => {
  const data = createValidPreviewData();
  data.menus.primary.items[0].type = 'custom';

  const result = validatePreviewData(data);
  assert.equal(result.ok, false);
  assert.equal(getIssueAtPath(result, 'menus.primary.items[0].type')?.code, 'UNKNOWN_PROPERTY');
});

test('validatePreviewData rejects menu item meta objects', () => {
  const invalidMeta = createValidPreviewData();
  invalidMeta.menus.primary.items[0].meta = {
    icon: 'home',
    options: { tone: 'accent' },
  };

  const metaResult = validatePreviewData(invalidMeta);
  assert.equal(metaResult.ok, false);
  assert.equal(getIssueAtPath(metaResult, 'menus.primary.items[0].meta.options')?.code, 'INVALID_META_VALUE');
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

test('validatePreviewData accepts empty and whitespace-only widget titles', () => {
  for (const title of ['', ' \t\n ']) {
    const data = createValidPreviewData();
    data.widgets.sidebar.items[0].title = title;

    const result = validatePreviewData(data);
    assert.equal(result.ok, true, `Expected widget title ${JSON.stringify(title)} to be accepted`);
  }
});

test('validatePreviewData requires widget titles to be strings', () => {
  const invalidTitles = [null, 42];

  for (const title of invalidTitles) {
    const data = createValidPreviewData();
    data.widgets.sidebar.items[0].title = title;

    const result = validatePreviewData(data);
    assert.equal(result.ok, false, `Expected widget title ${JSON.stringify(title)} to be rejected`);
    assert.equal(getIssueAtPath(result, 'widgets.sidebar.items[0].title')?.code, 'INVALID_WIDGET_ITEM_TITLE');
  }

  const missing = createValidPreviewData();
  delete missing.widgets.sidebar.items[0].title;

  const missingResult = validatePreviewData(missing);
  assert.equal(missingResult.ok, false);
  assert.equal(getIssueAtPath(missingResult, 'widgets.sidebar.items[0].title')?.code, 'MISSING_REQUIRED_PROPERTY');
  assert.equal(missingResult.errors.some((issue) => issue.path === 'widgets.sidebar.items[0].title' && issue.code === 'INVALID_WIDGET_ITEM_TITLE'), true);
});

test('validatePreviewData rejects invalid widget item shells', () => {
  const data = createValidPreviewData();
  data.widgets.sidebar.items[0] = {
    type: '',
    title: null,
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
  const headHtml = '\n  <meta name="site-verification" content="ok">\n<script async src="https://example.com/tracker.js"></script>\n';
  headOnly.custom_html = {
    head_end: headHtml,
  };

  const bodyOnly = createValidPreviewData();
  bodyOnly.custom_html = {
    body_end: '<script defer src="/vendor/app.js"></script>',
  };

  const bothSlots = createValidPreviewData();
  bothSlots.custom_html = {
    head_end: '</head><body data-trusted="yes"><script>window.dataLayer = window.dataLayer || [];</script>',
    body_end: '<script>window.__zp_custom = true;</script>',
  };

  assert.equal(validatePreviewData(headOnly).ok, true);
  assert.equal(headOnly.custom_html.head_end, headHtml, 'validation must preserve raw slot whitespace');
  assert.equal(validatePreviewData(bodyOnly).ok, true);
  assert.equal(validatePreviewData(bothSlots).ok, true);

  const maximumLength = createValidPreviewData();
  maximumLength.custom_html = { head_end: '😀'.repeat(65_536) };
  assert.equal(validatePreviewData(maximumLength).ok, true);
});

test('validatePreviewData rejects invalid custom_html payloads', () => {
  const emptyCustomHtml = createValidPreviewData();
  emptyCustomHtml.custom_html = {};
  const emptyCustomHtmlResult = validatePreviewData(emptyCustomHtml);
  assert.equal(emptyCustomHtmlResult.ok, false);
  assert.equal(emptyCustomHtmlResult.errors.some((issue) => issue.path === 'custom_html'), true);

  for (const value of ['', '   \n', null, 123, { content: '<script></script>' }, '😀'.repeat(65_537)]) {
    const invalidSlot = createValidPreviewData();
    invalidSlot.custom_html = { head_end: value };
    const result = validatePreviewData(invalidSlot);
    assert.equal(result.ok, false, `Expected custom_html slot ${typeof value} to be rejected`);
    assert.equal(getIssueAtPath(result, 'custom_html.head_end')?.code, 'INVALID_CUSTOM_HTML_SLOT');
  }

  const unknownSlot = createValidPreviewData();
  unknownSlot.custom_html = {
    body_end: '<script></script>',
    footer_end: '<script></script>',
  };
  const unknownSlotResult = validatePreviewData(unknownSlot);
  assert.equal(unknownSlotResult.ok, false);
  assert.equal(getIssueAtPath(unknownSlotResult, 'custom_html.footer_end')?.code, 'UNKNOWN_PROPERTY');
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

test('validatePreviewData accepts optional site logo', () => {
  const data = createValidPreviewData();
  data.site.logo = {
    src: '/logo.svg',
    alt: 'Example logo',
  };

  const result = validatePreviewData(data);
  assert.equal(result.ok, true);
});

test('validatePreviewData rejects invalid site logo', () => {
  const cases = [
    { logo: {}, path: 'site.logo.src' },
    { logo: { src: '' }, path: 'site.logo.src' },
    { logo: { src: '//cdn.example.com/logo.svg' }, path: 'site.logo.src' },
    { logo: { src: '/logo.svg', alt: 1 }, path: 'site.logo.alt' },
    { logo: { src: '/logo.svg', width: 120 }, path: 'site.logo.width' },
  ];

  for (const { logo, path } of cases) {
    const data = createValidPreviewData();
    data.site.logo = logo;

    const result = validatePreviewData(data);
    assert.equal(result.ok, false);
    assert.equal(result.errors.some((issue) => issue.path === path), true);
  }
});

test('validatePreviewData accepts optional site robots policy', () => {
  for (const value of [undefined, { allow_indexing: true }, { allow_indexing: false }]) {
    const data = createValidPreviewData();
    if (value !== undefined) {
      data.site.robots = value;
    }

    const result = validatePreviewData(data);
    assert.equal(result.ok, true);
  }
});

test('validatePreviewData accepts omitted and explicit site feature states', () => {
  for (const featureName of ['search', 'feed', 'archive']) {
    for (const value of [undefined, { enabled: true }, { enabled: false }]) {
      const data = createValidPreviewData();
      if (value !== undefined) {
        data.site[featureName] = value;
      }

      const result = validatePreviewData(data);
      assert.equal(result.ok, true, `Expected site.${featureName}=${JSON.stringify(value)} to be accepted`);
    }
  }
});

test('validatePreviewData rejects invalid and legacy site feature states', () => {
  for (const featureName of ['search', 'feed', 'archive']) {
    const cases = [
      [{}, `site.${featureName}.enabled`, 'MISSING_REQUIRED_PROPERTY'],
      [true, `site.${featureName}`, 'INVALID_OBJECT'],
      [false, `site.${featureName}`, 'INVALID_OBJECT'],
      [null, `site.${featureName}`, 'INVALID_OBJECT'],
      [{ enabled: 'false' }, `site.${featureName}.enabled`, `INVALID_SITE_${featureName.toUpperCase()}_ENABLED`],
      [{ enabled: true, mode: 'auto' }, `site.${featureName}.mode`, 'UNKNOWN_PROPERTY'],
    ];

    for (const [value, issuePath, issueCode] of cases) {
      const data = createValidPreviewData();
      data.site[featureName] = value;

      const result = validatePreviewData(data);
      assert.equal(result.ok, false, `Expected site.${featureName}=${JSON.stringify(value)} to be rejected`);
      assert.equal(getIssueAtPath(result, issuePath)?.code, issueCode);
    }
  }
});

test('validatePreviewData rejects removed site.disallow_comments', () => {
  const data = createValidPreviewData();
  data.site.disallow_comments = false;

  const result = validatePreviewData(data);
  assert.equal(result.ok, false);
  assert.equal(getIssueAtPath(result, 'site.disallow_comments')?.code, 'UNKNOWN_PROPERTY');
});

test('validatePreviewData rejects malformed robots and removed site.indexing', () => {
  for (const value of [{}, true, { allow_indexing: 'false' }, { allow_indexing: true, extra: true }]) {
    const data = createValidPreviewData();
    data.site.robots = value;

    const result = validatePreviewData(data);
    assert.equal(result.ok, false);
    assert.equal(result.errors.some((issue) => issue.path.startsWith('site.robots')), true);
  }

  const legacy = createValidPreviewData();
  legacy.site.indexing = true;
  assert.equal(getIssueAtPath(validatePreviewData(legacy), 'site.indexing')?.code, 'UNKNOWN_PROPERTY');
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
        { type: 'page', path: 'about' },
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
        { type: 'page', path: '../bad' },
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
  assert.equal(result.errors.some((issue) => issue.path === 'collections.-bad.items[3].path'), true);
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

test('validatePreviewData accepts root-relative author avatar and featured_image', () => {
  const data = createValidPreviewData();
  data.content.authors[0].avatar = '/images/author-avatar.png';
  data.content.posts[0].featured_image = '/images/post-share.png';
  data.content.pages[0].excerpt = 'Updated page summary';
  data.content.pages[0].featured_image = '/images/page-share.png';

  const result = validatePreviewData(data);
  assert.equal(result.ok, true);
});

test('validatePreviewData accepts an empty or HTTP(S) media origin with an optional root slash', () => {
  const validOrigins = [
    '',
    'https://media.example.com',
    'https://media.example.com/',
    'HTTP://MEDIA.EXAMPLE.COM',
    'http://media.example.com:8787',
    'https://[2001:db8::1]:8443/',
  ];

  for (const value of validOrigins) {
    const data = createValidPreviewData();
    data.site.media_origin = value;

    const result = validatePreviewData(data);
    assert.equal(result.ok, true, `Expected media origin ${value} to be accepted`);
    assert.equal(data.site.media_origin, value, 'validation must not mutate the input payload');
  }
});

test('validatePreviewData rejects non-origin media URLs', () => {
  const invalidOrigins = [
    'https://user@media.example.com',
    'https://user:password@media.example.com',
    'https://media.example.com/imported',
    'https://media.example.com//',
    'https://media.example.com/.',
    'https://media.example.com?tenant=1',
    'https://media.example.com/#images',
    'https://media.example.com:65536',
    'https://media.example.com:',
    'https://[::::]',
    '//media.example.com',
    'ftp://media.example.com',
    ' https://media.example.com',
    'https://media.example.com%zz',
  ];

  for (const value of invalidOrigins) {
    const data = createValidPreviewData();
    data.site.media_origin = value;

    const result = validatePreviewData(data);
    assert.equal(result.ok, false, `Expected media origin ${value} to be rejected`);
    assert.equal(getIssueAtPath(result, 'site.media_origin')?.code, 'INVALID_SITE_MEDIA_ORIGIN');
  }
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

test('validatePreviewData requires a non-empty media origin for media_domain delivery', () => {
  const data = createValidPreviewData();
  data.site.media_origin = '';
  data.site.media_delivery_mode = 'media_domain';

  const result = validatePreviewData(data);
  assert.equal(result.ok, false);
  assert.equal(getIssueAtPath(result, 'site.media_origin')?.code, 'INVALID_SITE_MEDIA_DELIVERY_CONFIGURATION');
});

test('validatePreviewData accepts optional site.favicon entries', () => {
  const data = createValidPreviewData();
  data.site.favicon = {
    icon: '/favicon.ico',
    icon_dark: '/favicon.dark.ico',
    svg: '/favicon.svg',
    png: 'https://cdn.example.com/favicon.png',
    apple_touch_icon: '/apple-touch-icon.png',
  };

  const result = validatePreviewData(data);
  assert.equal(result.ok, true);
});

test('validatePreviewData accepts site.favicon with only icon_dark', () => {
  const data = createValidPreviewData();
  data.site.favicon = {
    icon_dark: '/favicon.dark.ico',
  };

  const result = validatePreviewData(data);
  assert.equal(result.ok, true);
});

test('validatePreviewData accepts optional site.expose_generator policy', () => {
  const omitted = createValidPreviewData();
  assert.equal(validatePreviewData(omitted).ok, true);

  const exposed = createValidPreviewData();
  exposed.site.expose_generator = true;
  assert.equal(validatePreviewData(exposed).ok, true);

  const hidden = createValidPreviewData();
  hidden.site.expose_generator = false;
  assert.equal(validatePreviewData(hidden).ok, true);
});

test('validatePreviewData rejects invalid site.expose_generator values', () => {
  for (const value of ['false', 0, null]) {
    const data = createValidPreviewData();
    data.site.expose_generator = value;

    const result = validatePreviewData(data);
    assert.equal(result.ok, false);
    assert.equal(getIssueAtPath(result, 'site.expose_generator')?.code, 'INVALID_SITE_EXPOSE_GENERATOR');
  }
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
    icon_dark: 'javascript:alert(1)',
    svg: '//cdn.example.com/favicon.svg',
    png: 123,
    shortcut_icon: '/shortcut.ico',
  };
  const invalidResult = validatePreviewData(invalidFavicon);
  assert.equal(invalidResult.ok, false);
  assert.equal(getIssueAtPath(invalidResult, 'site.favicon.icon')?.code, 'INVALID_SITE_FAVICON_URL');
  assert.equal(getIssueAtPath(invalidResult, 'site.favicon.icon_dark')?.code, 'INVALID_SITE_FAVICON_URL');
  assert.equal(getIssueAtPath(invalidResult, 'site.favicon.svg')?.code, 'INVALID_SITE_FAVICON_URL');
  assert.equal(getIssueAtPath(invalidResult, 'site.favicon.png')?.code, 'INVALID_SITE_FAVICON_URL');
  assert.equal(invalidResult.errors.some((issue) => issue.path === 'site.favicon.shortcut_icon'), true);
});

test('validatePreviewData allows an empty string for site.media_origin', () => {
  const data = createValidPreviewData();
  data.site.media_origin = '';

  const result = validatePreviewData(data);
  assert.equal(result.ok, true);
});

test('validatePreviewData rejects missing site.media_origin', () => {
  const data = createValidPreviewData();
  delete data.site.media_origin;

  const result = validatePreviewData(data);
  assert.equal(result.ok, false);
  assert.equal(result.errors.some((issue) => issue.path === 'site.media_origin'), true);
});

test('validatePreviewData rejects removed site.media_base_url', () => {
  const data = createValidPreviewData();
  data.site.media_base_url = 'https://media.example.com';

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

test('validatePreviewData accepts the shared web URL forms', () => {
  const siteUrls = ['', 'https://example.com', 'HTTP://example.com', 'https://example.com/'];
  for (const value of siteUrls) {
    const data = createValidPreviewData();
    data.site.url = value;
    assert.equal(validatePreviewData(data).ok, true, `Expected site URL ${value} to be accepted`);
  }

  const navigationUrls = [
    'https://cdn.example.com/image.png?width=320#preview',
    'HTTP://cdn.example.com/image.png',
    'https://cdn.example.com/image.png?next=/../#preview',
    '/',
    '/images/logo.svg?dark=1#mark',
    '/image%20name.svg',
  ];
  for (const value of navigationUrls) {
    const data = createValidPreviewData();
    data.menus.primary.items[0].url = value;
    assert.equal(validatePreviewData(data).ok, true, `Expected navigation URL ${value} to be accepted`);
  }

  for (const value of navigationUrls.filter((entry) => entry !== '/')) {
    const data = createValidPreviewData();
    data.content.authors[0].avatar = value;
    data.content.posts[0].featured_image = value;
    data.content.pages[0].featured_image = value;
    assert.equal(validatePreviewData(data).ok, true, `Expected media URL ${value} to be accepted`);
  }
});

test('validatePreviewData rejects non-web and malformed URL forms consistently', () => {
  const invalidBaseUrls = [
    'ftp://example.com/file',
    'urn:example:test',
    '//example.com/path',
    'https:///path',
    'https:example.com',
    'https://example.com:',
    'https://@example.com',
    'https://example.com:65536/path',
    'https://[::::]/path',
    'https://example.com/%zz',
    `https://example.com/a${String.fromCharCode(0x85)}b`,
    ' https://example.com',
    'https://user:secret@example.com',
    'https://example.com/path',
    'https://example.com?query=1',
    'https://example.com#fragment',
  ];
  for (const value of invalidBaseUrls) {
    const data = createValidPreviewData();
    data.site.url = value;
    assert.equal(validatePreviewData(data).ok, false, `Expected base URL ${value} to be rejected`);
  }

  const invalidUrlLikes = [
    '//example.com/path',
    'mailto:docs@example.com',
    'tel:+12025550123',
    'javascript:alert(1)',
    'ftp://example.com/file',
    '?query=only',
    '#fragment-only',
    '.',
    '..',
    './',
    '../',
    '/a/../b',
    '/a/%2e%2e/b',
    'https:///path',
    'https:example.com',
    'images\\logo.svg',
    'images/logo file.svg',
    'images/logo%zz.svg',
    `images/logo${String.fromCharCode(0)}.svg`,
    `images/logo${String.fromCharCode(0x85)}.svg`,
  ];
  for (const value of invalidUrlLikes) {
    const data = createValidPreviewData();
    data.menus.primary.items[0].url = value;
    const result = validatePreviewData(data);
    assert.equal(result.ok, false, `Expected URL-like value ${JSON.stringify(value)} to be rejected`);
    assert.equal(getIssueAtPath(result, 'menus.primary.items[0].url')?.code, 'INVALID_MENU_ITEM_URL');
  }

  for (const value of ['/', './image.svg', 'image.svg', 'https://example.com/', 'https://user@example.com/image.svg', '/a/../image.svg']) {
    const data = createValidPreviewData();
    data.content.authors[0].avatar = value;
    const result = validatePreviewData(data);
    assert.equal(result.ok, false, `Expected media URL ${JSON.stringify(value)} to be rejected`);
    assert.equal(getIssueAtPath(result, 'content.authors[0].avatar')?.code, 'INVALID_AUTHOR_AVATAR');
  }
});

test('validatePreviewData keeps newsletter URLs root-relative or absolute HTTP(S)', () => {
  for (const value of ['/', '/newsletter', '/newsletter?source=site#form', 'HTTPS://example.com/newsletter']) {
    const data = createValidPreviewData();
    data.site.newsletter = { enabled: true, signup_url: value };
    assert.equal(validatePreviewData(data).ok, true, `Expected newsletter URL ${value} to be accepted`);
  }

  for (const value of ['newsletter', './newsletter', '//example.com/newsletter', '?only', 'mailto:docs@example.com', '/news%zz', '/a/../newsletter']) {
    const data = createValidPreviewData();
    data.site.newsletter = { enabled: true, signup_url: value };
    assert.equal(validatePreviewData(data).ok, false, `Expected newsletter URL ${value} to be rejected`);
  }
});

test('assertPreviewData throws on invalid payload', () => {
  const data = createValidPreviewData();
  data.version = '0.6';

  assert.throws(() => assertPreviewData(data), /INVALID_VERSION/);
});

test('isPreviewData narrows valid payloads', () => {
  assert.equal(isPreviewData(createValidPreviewData()), true);
  assert.equal(isPreviewData({ version: PREVIEW_DATA_VERSION }), false);
});

test('published schema files are stored outside src', async () => {
  await fs.access(new URL('../schemas/preview-data.v0.5.schema.json', import.meta.url));
  await fs.access(new URL('../schemas/preview-data.v0.6.schema.json', import.meta.url));
  await fs.access(new URL('../schemas/preview-data.v0.7.schema.json', import.meta.url));
  await fs.access(new URL('../scripts/schema.js', import.meta.url));
});

test('generated v0.7 schema matches the committed contract and preserves annotations', async () => {
  const committed = JSON.parse(await fs.readFile(new URL('../schemas/preview-data.v0.7.schema.json', import.meta.url), 'utf8'));
  const generated = buildPreviewDataSchema();

  assert.deepEqual(committed, generated);
  assert.equal(Object.keys(committed).at(-1), 'examples');
  assert.equal(Object.keys(generated).at(-1), 'examples');
  assert.equal(generated.$id, 'https://schemas.zeropress.dev/preview-data/v0.7/schema.json');
  assert.equal(generated.title, 'ZeroPress Preview Data v0.7');
  assert.equal(generated.description, 'Canonical site data consumed by ZeroPress Build Core and ZeroPress theme preview tooling.');
  assert.equal(generated.properties.version.const, '0.7');
  const schemaDescriptions = [];
  const collectDescriptions = (value) => {
    if (!value || typeof value !== 'object') {
      return;
    }
    for (const [key, child] of Object.entries(value)) {
      if ((key === 'description' || key === 'markdownDescription') && typeof child === 'string') {
        schemaDescriptions.push(child);
      } else {
        collectDescriptions(child);
      }
    }
  };
  collectDescriptions(generated);
  assert.deepEqual(schemaDescriptions.filter((description) => description.includes('v0.7')), []);
  assert.deepEqual(Object.keys(generated), [
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
  assert.equal(generated.examples.length, 1);
  assert.equal(generated.examples[0].version, '0.7');
  assert.equal(generated.examples[0].$schema, 'https://schemas.zeropress.dev/preview-data/v0.7/schema.json');
  assert.equal(validatePreviewData(generated.examples[0]).ok, true);
  assert.equal(generated.$defs.menuItem.properties.url.description.length > 0, true);
  assert.equal(Object.hasOwn(generated.$defs.menuItem.properties, 'type'), false);
  assert.equal(generated.$defs.menuItem.required.includes('type'), false);
  assert.equal(generated.$defs.widgets.default && Object.keys(generated.$defs.widgets.default).length === 0, true);
  assert.equal(generated.$defs.site.required.includes('datetime_display'), false);
  assert.equal(Object.hasOwn(generated.$defs.site.properties, 'datetime_display'), false);
  assert.equal(generated.$defs.site.required.includes('media_origin'), true);
  assert.equal(Object.hasOwn(generated.$defs.site.properties, 'media_origin'), true);
  assert.equal(Object.hasOwn(generated.$defs.site.properties, 'media_base_url'), false);
  assert.equal(generated.examples[0].site.media_origin, 'https://media.example.com');
  assert.equal(generated.examples[0].site.media_origin.endsWith('/'), false);
  assert.equal(generated.$defs.site.required.includes('comments'), false);
  assert.equal(generated.$defs.site.required.includes('disallow_comments'), false);
  assert.equal(Object.hasOwn(generated.$defs.site.properties, 'disallow_comments'), false);
  for (const featureName of ['search', 'feed', 'archive']) {
    assert.deepEqual(generated.$defs.site.properties[featureName].default, { enabled: true });
    assert.equal(generated.$defs.site.properties[featureName].$ref, '#/$defs/siteFeatureState');
  }
  assert.deepEqual(generated.$defs.site.properties.robots.default, { allow_indexing: true });
  assert.deepEqual(generated.$defs.siteRobots.required, ['allow_indexing']);
  assert.equal(Object.hasOwn(generated.$defs.site.properties, 'indexing'), false);
  assert.equal(generated.$defs.frontPage.oneOf.length, 3);
  assert.equal(generated.$defs.collectionItem.oneOf.length, 2);
  assert.equal(Object.hasOwn(generated.$defs.frontPage.properties, 'page_slug'), false);
  assert.equal(Object.hasOwn(generated.$defs.collectionItem.properties, 'path'), true);
  assert.equal(Object.hasOwn(generated.$defs, 'webUrl'), false);
  assert.equal(Object.hasOwn(generated.$defs, 'urlLike'), false);
  assert.equal(generated.$defs.site.allOf.length, 1);
  assert.deepEqual(generated.$defs.siteFeatureState.required, ['enabled']);
  assert.equal(generated.$defs.siteFeatureState.additionalProperties, false);
  assert.equal(Object.hasOwn(generated.$defs.siteFavicon.properties, 'icon_dark'), true);
  assert.equal(generated.$defs.siteFavicon.anyOf.some((entry) => entry.required?.includes('icon_dark')), true);
  assert.equal(generated.examples[0].site.favicon.icon_dark, '/favicon.dark.ico');
  assert.equal(generated.$defs.siteComments.required.includes('enabled'), true);
  assert.equal(generated.$defs.siteComments.required.includes('api_base_url'), true);
  assert.equal(generated.$defs.siteComments.properties.provider.default, 'zeropress');
  assert.equal(generated.$defs.siteComments.properties.per_page.default, 50);
  assert.equal(generated.$defs.siteComments.properties.order.default, 'desc');
  assert.equal(generated.$defs.siteCommentsThreading.properties.enabled.default, true);
  assert.equal(generated.$defs.siteCommentsThreading.properties.max_depth.default, 2);
  assert.equal(generated.$defs.page.required.includes('public_id'), false);
  assert.equal(generated.$defs.page.required.includes('allow_comments'), false);
  assert.equal(generated.$defs.page.properties.allow_comments.default, false);
  assert.equal(generated.$defs.contentComments.required.includes('request_token'), true);
  assert.equal(generated.$defs.contentComments.properties.request_token.maxLength, 512);
  assert.equal(generated.$defs.post.properties.tag_slugs.uniqueItems, true);
  assert.equal(generated.$defs.post.properties.tag_slugs['x-zeropress-unique-after-normalization'], 'NFC');
  assert.match(generated.$defs.post.properties.tag_slugs.description, /display order/);
  assert.match(generated.$defs.content.properties.tags.description, /no semantic meaning/);
  assert.equal(Object.hasOwn(generated.$defs.post.properties, 'id'), false);
  assert.equal(Object.hasOwn(generated.$defs, 'customHtmlSlot'), false);
  assert.equal(generated.$defs.customHtml.properties.head_end.type, 'string');
  assert.equal(generated.$defs.customHtml.properties.head_end.maxLength, 65_536);
  assert.equal(generated.$defs.customHtml.properties.body_end.type, 'string');
  assert.equal(generated.$defs.customHtml.properties.body_end.maxLength, 65_536);
  assert.deepEqual(generated.examples[0].custom_html, {
    head_end: '<meta name="site-verification" content="example">',
  });
  assert.equal(generated.allOf.length, 1);
  assert.equal(Object.hasOwn(generated.allOf[0], 'else'), false);
  assert.equal(Object.hasOwn(generated.$defs.zeroPressCommentsItemPolicy, 'else'), false);
  assert.equal(Object.hasOwn(generated.$defs, 'noCommentsMetadataItemPolicy'), false);
  assert.equal(Object.hasOwn(generated.$defs, 'contentWithoutCommentsMetadata'), false);
  assert.equal(generated.$defs.widgetItem.required.includes('title'), true);
  assert.deepEqual(generated.$defs.widgetItem.properties.title, {
    type: 'string',
    description: 'Required display title string. An empty or whitespace-only value means the widget has no display title after normalization.',
    markdownDescription: 'Required display title string. An empty or whitespace-only value means the widget has no display title after normalization.',
  });
});

test('v0.7 schema patterns mirror runtime slug, path, permalink, and URL boundaries', () => {
  const schema = buildPreviewDataSchema();
  const regex = (pattern) => new RegExp(pattern, 'u');
  const slugPattern = regex(schema.$defs.slugSegment.pattern);
  const pagePathPattern = regex(schema.$defs.pagePath.pattern);
  const postIndexPattern = regex(schema.$defs.postIndexPath.pattern);
  const postPermalinkPattern = regex(schema.$defs.postPermalinkPattern.allOf[1].pattern);
  const slugPermalinkPattern = regex(schema.$defs.slugPermalinkPattern.allOf[1].pattern);
  const webUrlPattern = regex(schema.$defs.absoluteWebUrl.pattern);
  const mediaOriginPattern = regex(schema.$defs.mediaOrigin.anyOf[1].pattern);
  const navigationRelativePattern = regex(schema.$defs.navigationUrl.anyOf[1].pattern);
  const mediaRelativePattern = regex(schema.$defs.mediaUrl.anyOf[1].pattern);
  const absoluteMediaPathPattern = regex(schema.$defs.mediaUrl.anyOf[0].allOf[1].pattern);
  const commentsAbsolutePattern = webUrlPattern;
  const commentsAbsoluteForbiddenPatterns = schema.$defs.commentsApiBaseUrl.anyOf[0].allOf[1].not.anyOf.map((entry) => regex(entry.pattern));
  const commentsRelativePattern = regex(schema.$defs.commentsApiBaseUrl.anyOf[1].pattern);

  const decomposed = 'e\u0301'.repeat(101);
  assert.equal(schema.$defs.slugSegment.maxLength, undefined);
  assert.equal(schema.$defs.slugSegment['x-zeropress-nfc-max-code-points'], 200);
  assert.equal(schema.$defs.pagePath['x-zeropress-literal-segment-nfc-max-code-points'], 200);
  assert.equal(schema.$defs.postIndexPath['x-zeropress-literal-segment-nfc-max-code-points'], 200);
  assert.equal(schema.$defs.permalinkPattern['x-zeropress-literal-segment-nfc-max-code-points'], 200);
  assert.equal(slugPattern.test('हिन्दी'), true);
  assert.equal(slugPattern.test('theme-runtime-v0.7'), true);
  assert.equal(slugPattern.test(decomposed), true);
  assert.equal(slugPattern.test('a'.repeat(201)), true, 'normalization-aware length remains a runtime invariant');
  assert.equal(slugPattern.test('news!'), false);
  for (const value of ['.', '..', '.hidden', 'version.', 'v0..7']) {
    assert.equal(slugPattern.test(value), false, `Expected slug schema to reject ${value}`);
  }
  assert.equal(pagePathPattern.test('docs/회사소개'), true);
  assert.equal(pagePathPattern.test('spec/theme-runtime-v0.7'), true);
  assert.equal(pagePathPattern.test('docs/page.html'), false);
  assert.equal(pagePathPattern.test('docs/page.html/intro'), false);
  assert.equal(pagePathPattern.test('docs/page.HTML'), true, 'literal .html restriction remains case-sensitive like runtime');
  assert.equal(pagePathPattern.test(`docs/${decomposed}`), true);
  assert.equal(pagePathPattern.test(`docs/${'a'.repeat(201)}`), true, 'literal segment length remains a runtime invariant');
  assert.equal(postIndexPattern.test('/'), true);
  assert.equal(postIndexPattern.test('/spec/theme-runtime-v0.7/'), true);
  assert.equal(postIndexPattern.test('/blog.html'), false);
  assert.equal(postIndexPattern.test('/blog.html/archive'), false);
  assert.equal(postIndexPattern.test('/news!'), false);
  assert.equal(postIndexPattern.test(`/${decomposed}`), true);
  assert.equal(postIndexPattern.test(`/${'a'.repeat(201)}`), true, 'literal segment length remains a runtime invariant');
  assert.equal(postPermalinkPattern.test('/:slug/'), true);
  assert.equal(postPermalinkPattern.test('/posts/:public_id'), true);
  assert.equal(postPermalinkPattern.test('/release/v0.7/:slug'), true);
  assert.equal(postPermalinkPattern.test('/docs/page.html/:slug'), false);
  assert.equal(postPermalinkPattern.test(`/${decomposed}/:slug`), true);
  assert.equal(postPermalinkPattern.test('/posts/:year'), false);
  assert.equal(slugPermalinkPattern.test('/:slug/'), true);
  assert.equal(slugPermalinkPattern.test('/:public_id/'), false);
  for (const value of ['docs/.hidden', 'docs/version.', 'docs/v0..7']) {
    assert.equal(pagePathPattern.test(value), false, `Expected page path schema to reject ${value}`);
    assert.equal(postIndexPattern.test(`/${value}`), false, `Expected post index schema to reject /${value}`);
    assert.equal(postPermalinkPattern.test(`/${value}/:slug`), false, `Expected permalink schema to reject /${value}/:slug`);
  }
  assert.equal(webUrlPattern.test('HTTPS://example.com/path'), true);
  assert.equal(schema.$defs.absoluteWebUrl.pattern, ABSOLUTE_WEB_URL_PATTERN_SOURCE);
  assert.equal(webUrlPattern.test('https:///path'), false);
  assert.equal(webUrlPattern.test('https:example.com'), false);
  assert.equal(webUrlPattern.test('https://example.com:'), false);
  assert.equal(webUrlPattern.test('https://@example.com'), false);
  assert.equal(webUrlPattern.test('https://example.com:65536/path'), true, 'port range remains a runtime invariant');
  assert.equal(webUrlPattern.test('https://[::::]/path'), true, 'IP syntax remains a runtime invariant');
  assert.equal(webUrlPattern.test('https://example.com/%zz'), false);
  assert.equal(webUrlPattern.test(`https://example.com/a${String.fromCharCode(0x85)}b`), false);
  assert.equal(schema.$defs.mediaOrigin.anyOf[1].pattern, MEDIA_ORIGIN_PATTERN_SOURCE);
  assert.equal(mediaOriginPattern.test('https://media.example.com'), true);
  assert.equal(mediaOriginPattern.test('https://media.example.com/'), true);
  assert.equal(mediaOriginPattern.test('http://media.example.com:8787'), true);
  for (const value of [
    'https://user@media.example.com',
    'https://media.example.com/imported',
    'https://media.example.com?tenant=1',
    'https://media.example.com/#images',
  ]) {
    assert.equal(mediaOriginPattern.test(value), false, `Expected media origin schema to reject ${value}`);
  }
  assert.equal(navigationRelativePattern.test('/'), true);
  assert.equal(navigationRelativePattern.test('/images/logo.svg?dark=1#mark'), true);
  assert.equal(mediaRelativePattern.test('/images/logo.svg?dark=1#mark'), true);
  assert.equal(mediaRelativePattern.test('/'), false);
  assert.equal(absoluteMediaPathPattern.test('https://example.com/image.svg'), true);
  assert.equal(absoluteMediaPathPattern.test('https://example.com/'), false);
  for (const value of ['.', '..', './', '../', '?only', '#only', '//example.com', 'images/logo.svg', '/images/logo%zz.svg', `/${String.fromCharCode(0x85)}.svg`]) {
    assert.equal(navigationRelativePattern.test(value), false, `Expected schema to reject ${value}`);
  }
  assert.equal(commentsAbsolutePattern.test('https://comments.example.com/api'), true);
  assert.equal(commentsAbsoluteForbiddenPatterns.some((pattern) => pattern.test('https://comments.example.com/api')), false);
  assert.equal(commentsAbsoluteForbiddenPatterns.some((pattern) => pattern.test('https://user@comments.example.com/api')), true);
  assert.equal(commentsAbsoluteForbiddenPatterns.some((pattern) => pattern.test('https://comments.example.com/api?tenant=1')), true);
  assert.equal(commentsRelativePattern.test('/'), true);
  assert.equal(commentsRelativePattern.test('/api/comments'), true);
  assert.equal(commentsRelativePattern.test('//comments.example.com/api'), false);
  assert.equal(commentsRelativePattern.test('/api/comments?tenant=1'), false);
  assert.equal(commentsRelativePattern.test('/api/../comments'), false);
  assert.equal(schema.$defs.collection.properties.items.uniqueItems, true);
});

test('historical v0.5 schema remains byte-identical', async () => {
  const content = await fs.readFile(new URL('../schemas/preview-data.v0.5.schema.json', import.meta.url));
  const digest = crypto.createHash('sha256').update(content).digest('hex');
  assert.equal(digest, '079acbf105e205704b9d60a66db90ea56800b7f9ad369c61cadb7aa4281c989b');
});

test('historical v0.6 schema remains byte-identical', async () => {
  const content = await fs.readFile(new URL('../schemas/preview-data.v0.6.schema.json', import.meta.url));
  const digest = crypto.createHash('sha256').update(content).digest('hex');
  assert.equal(digest, '688caccf24d0cffd53b0a33cb5be6f8ecbc7596aef8ad9de82e939a0e2d0a20f');
});

test('TypeScript declarations expose path only on pages', async () => {
  const declarations = await fs.readFile(new URL('../src/index.d.ts', import.meta.url), 'utf8');
  const post = declarations.match(/export interface PreviewPostData \{([\s\S]*?)\n\}/)?.[1];
  const page = declarations.match(/export interface PreviewPageData \{([\s\S]*?)\n\}/)?.[1];

  assert.ok(post, 'PreviewPostData declaration must exist');
  assert.ok(page, 'PreviewPageData declaration must exist');
  assert.doesNotMatch(post, /^\s*id\??:/m);
  assert.doesNotMatch(post, /^\s*path\??:/m);
  assert.match(page, /^\s*path\?: string;$/m);
});

test('TypeScript declarations expose the v0.7 contract without a v0.6 compatibility type', async () => {
  const declarations = await fs.readFile(new URL('../src/index.d.ts', import.meta.url), 'utf8');
  const site = declarations.match(/export interface PreviewSiteData \{([\s\S]*?)\n\}/)?.[1];
  const post = declarations.match(/export interface PreviewPostData \{([\s\S]*?)\n\}/)?.[1];
  const page = declarations.match(/export interface PreviewPageData \{([\s\S]*?)\n\}/)?.[1];
  const menuItem = declarations.match(/export interface PreviewMenuItemData \{([\s\S]*?)\n\}/)?.[1];

  assert.ok(site);
  assert.ok(post);
  assert.ok(page);
  assert.ok(menuItem);
  assert.match(declarations, /export type PreviewCommentsProvider = 'zeropress' \| 'wordpress';/);
  assert.match(declarations, /export type PreviewCommentsOrder = 'asc' \| 'desc';/);
  assert.match(declarations, /export interface PreviewSiteCommentsData \{/);
  assert.match(declarations, /export interface PreviewSiteFeatureStateData \{/);
  assert.match(declarations, /export interface PreviewSiteCommentsData \{\n\s*enabled: boolean;\n\s*api_base_url: string;/);
  assert.match(declarations, /export interface PreviewContentCommentsData \{/);
  assert.match(declarations, /export interface PreviewCustomHtmlData \{\n\s*head_end\?: string;\n\s*body_end\?: string;\n\}/);
  assert.doesNotMatch(declarations, /PreviewCustomHtmlSlotData/);
  assert.match(site, /^\s*media_origin: string;$/m);
  assert.doesNotMatch(site, /^\s*media_base_url:/m);
  assert.match(site, /^\s*comments\?: PreviewSiteCommentsData;$/m);
  assert.match(site, /^\s*search\?: PreviewSiteFeatureStateData;$/m);
  assert.match(site, /^\s*feed\?: PreviewSiteFeatureStateData;$/m);
  assert.match(site, /^\s*archive\?: PreviewSiteFeatureStateData;$/m);
  assert.match(site, /^\s*robots\?: PreviewSiteRobotsData;$/m);
  assert.doesNotMatch(site, /^\s*disallow_comments:/m);
  assert.doesNotMatch(site, /^\s*indexing:/m);
  assert.match(declarations, /export interface PreviewSiteRobotsData \{\n\s*allow_indexing: boolean;/);
  assert.match(declarations, /\| \{ type: 'page'; page_path: string \}/);
  assert.match(declarations, /export interface PreviewCollectionPageItemData \{\n\s*type: 'page';\n\s*path: string;/);
  assert.match(declarations, /export interface PreviewSiteFaviconData \{[\s\S]*?\n\s*icon_dark\?: string;/);
  assert.match(post, /^\s*comments\?: PreviewContentCommentsData;$/m);
  assert.match(page, /^\s*public_id\?: number;$/m);
  assert.match(page, /^\s*allow_comments\?: boolean;$/m);
  assert.match(page, /^\s*comments\?: PreviewContentCommentsData;$/m);
  assert.match(declarations, /export interface PreviewDataV07 \{/);
  assert.match(declarations, /version: '0\.7';/);
  assert.match(declarations, /export const PREVIEW_DATA_VERSION: '0\.7';/);
  assert.match(declarations, /data is PreviewDataV07;/);
  assert.doesNotMatch(declarations, /PreviewDataV06|version: '0\.6'|PREVIEW_DATA_VERSION: '0\.6'/);
  assert.doesNotMatch(declarations, /PreviewMenuItemType/);
  assert.doesNotMatch(menuItem, /^\s*type\??:/m);
});

test('package metadata retains historical schema exports', async () => {
  const manifest = JSON.parse(await fs.readFile(new URL('../package.json', import.meta.url), 'utf8'));

  assert.equal(manifest.exports['./preview-data.v0.5.schema.json'], './schemas/preview-data.v0.5.schema.json');
  assert.equal(manifest.exports['./preview-data.v0.6.schema.json'], './schemas/preview-data.v0.6.schema.json');
  assert.equal(manifest.exports['./preview-data.v0.7.schema.json'], './schemas/preview-data.v0.7.schema.json');
});

test('TypeScript declarations omit the removed datetime display contract', async () => {
  const declarations = await fs.readFile(new URL('../src/index.d.ts', import.meta.url), 'utf8');

  assert.doesNotMatch(declarations, /PreviewDatetimeDisplay|datetime_display/);
});
