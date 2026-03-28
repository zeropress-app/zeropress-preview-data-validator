export const PREVIEW_DATA_VERSION = '0.3';

export function validatePreviewData(data) {
  const errors = [];

  validateClosedObject(data, '', errors, ['version', 'generator', 'generated_at', 'site', 'content', 'routes']);

  if (!errors.length) {
    validateLiteral(data.version, PREVIEW_DATA_VERSION, 'version', 'INVALID_VERSION', errors);
    validateNonEmptyString(data.generator, 'generator', 'INVALID_GENERATOR', errors);
    validateDateTimeString(data.generated_at, 'generated_at', 'INVALID_GENERATED_AT', errors);

    validateSite(data.site, 'site', errors);
    validateContent(data.content, 'content', errors);
    validateRoutes(data.routes, 'routes', errors);
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings: [],
  };
}

export function assertPreviewData(data) {
  const result = validatePreviewData(data);
  if (!result.ok) {
    const first = result.errors[0];
    throw new Error(first ? `${first.code} ${first.path}: ${first.message}` : 'Invalid preview data');
  }
  return data;
}

export function isPreviewData(data) {
  return validatePreviewData(data).ok;
}

function validateSite(site, path, errors) {
  validateObject(site, path, 'INVALID_SITE', errors);
  if (!isObject(site)) {
    return;
  }

  validateNonEmptyString(site.title, `${path}.title`, 'INVALID_SITE_TITLE', errors);
  validateString(site.description, `${path}.description`, 'INVALID_SITE_DESCRIPTION', errors);
  validateUri(site.url, `${path}.url`, 'INVALID_SITE_URL', errors);
  validateNonEmptyString(site.language, `${path}.language`, 'INVALID_SITE_LANGUAGE', errors);

  if (site.logo !== undefined) {
    validateUri(site.logo, `${path}.logo`, 'INVALID_SITE_LOGO', errors);
  }

  if (site.social !== undefined) {
    validateObject(site.social, `${path}.social`, 'INVALID_SITE_SOCIAL', errors);
    if (isObject(site.social)) {
      for (const [key, value] of Object.entries(site.social)) {
        validateString(value, `${path}.social.${key}`, 'INVALID_SITE_SOCIAL_VALUE', errors);
      }
    }
  }
}

function validateContent(content, path, errors) {
  validateClosedObject(content, path, errors, ['posts', 'pages', 'categories', 'tags']);
  if (!isObject(content)) {
    return;
  }

  validateArray(content.posts, `${path}.posts`, 'INVALID_POSTS', errors, (entry, index) => {
    validatePreviewPost(entry, `${path}.posts[${index}]`, errors);
  });
  validateArray(content.pages, `${path}.pages`, 'INVALID_PAGES', errors, (entry, index) => {
    validatePreviewPage(entry, `${path}.pages[${index}]`, errors);
  });
  validateArray(content.categories, `${path}.categories`, 'INVALID_CATEGORIES', errors, (entry, index) => {
    validatePreviewCategory(entry, `${path}.categories[${index}]`, errors);
  });
  validateArray(content.tags, `${path}.tags`, 'INVALID_TAGS', errors, (entry, index) => {
    validatePreviewTag(entry, `${path}.tags[${index}]`, errors);
  });
}

function validateRoutes(routes, path, errors) {
  validateClosedObject(routes, path, errors, ['index', 'archive', 'categories', 'tags']);
  if (!isObject(routes)) {
    return;
  }

  validateArray(routes.index, `${path}.index`, 'INVALID_INDEX_ROUTES', errors, (entry, index) => {
    validateIndexRoute(entry, `${path}.index[${index}]`, errors);
  });
  validateArray(routes.archive, `${path}.archive`, 'INVALID_ARCHIVE_ROUTES', errors, (entry, index) => {
    validateArchiveRoute(entry, `${path}.archive[${index}]`, errors);
  });
  validateArray(routes.categories, `${path}.categories`, 'INVALID_CATEGORY_ROUTES', errors, (entry, index) => {
    validateCategoryRoute(entry, `${path}.categories[${index}]`, errors);
  });
  validateArray(routes.tags, `${path}.tags`, 'INVALID_TAG_ROUTES', errors, (entry, index) => {
    validateTagRoute(entry, `${path}.tags[${index}]`, errors);
  });
}

function validatePreviewPost(post, path, errors) {
  validateClosedObject(post, path, errors, [
    'id',
    'public_id',
    'title',
    'slug',
    'html',
    'excerpt',
    'published_at',
    'updated_at',
    'published_at_iso',
    'updated_at_iso',
    'reading_time',
    'author_name',
    'author_avatar',
    'featured_image',
    'categories_html',
    'tags_html',
    'comments_html',
    'status',
  ]);
  if (!isObject(post)) {
    return;
  }

  validateNonEmptyString(post.id, `${path}.id`, 'INVALID_POST_ID', errors);
  validateInteger(post.public_id, `${path}.public_id`, 'INVALID_POST_PUBLIC_ID', errors, { minimum: 1 });
  validateNonEmptyString(post.title, `${path}.title`, 'INVALID_POST_TITLE', errors);
  validateNonEmptyString(post.slug, `${path}.slug`, 'INVALID_POST_SLUG', errors);
  validateString(post.html, `${path}.html`, 'INVALID_POST_HTML', errors);
  validateString(post.excerpt, `${path}.excerpt`, 'INVALID_POST_EXCERPT', errors);
  validateNonEmptyString(post.published_at, `${path}.published_at`, 'INVALID_POST_PUBLISHED_AT', errors);
  validateNonEmptyString(post.updated_at, `${path}.updated_at`, 'INVALID_POST_UPDATED_AT', errors);
  validateDateTimeString(post.published_at_iso, `${path}.published_at_iso`, 'INVALID_POST_PUBLISHED_AT_ISO', errors);
  validateDateTimeString(post.updated_at_iso, `${path}.updated_at_iso`, 'INVALID_POST_UPDATED_AT_ISO', errors);
  validateNonEmptyString(post.reading_time, `${path}.reading_time`, 'INVALID_POST_READING_TIME', errors);
  validateNonEmptyString(post.author_name, `${path}.author_name`, 'INVALID_POST_AUTHOR_NAME', errors);
  validateString(post.categories_html, `${path}.categories_html`, 'INVALID_POST_CATEGORIES_HTML', errors);
  validateString(post.tags_html, `${path}.tags_html`, 'INVALID_POST_TAGS_HTML', errors);
  validateString(post.comments_html, `${path}.comments_html`, 'INVALID_POST_COMMENTS_HTML', errors);
  validateEnum(post.status, `${path}.status`, 'INVALID_POST_STATUS', errors, ['published', 'draft']);

  if (post.author_avatar !== undefined) {
    validateUri(post.author_avatar, `${path}.author_avatar`, 'INVALID_POST_AUTHOR_AVATAR', errors);
  }
  if (post.featured_image !== undefined) {
    validateUri(post.featured_image, `${path}.featured_image`, 'INVALID_POST_FEATURED_IMAGE', errors);
  }
}

function validatePreviewPage(page, path, errors) {
  validateClosedObject(page, path, errors, ['id', 'title', 'slug', 'html', 'status']);
  if (!isObject(page)) {
    return;
  }

  validateNonEmptyString(page.id, `${path}.id`, 'INVALID_PAGE_ID', errors);
  validateNonEmptyString(page.title, `${path}.title`, 'INVALID_PAGE_TITLE', errors);
  validateNonEmptyString(page.slug, `${path}.slug`, 'INVALID_PAGE_SLUG', errors);
  validateString(page.html, `${path}.html`, 'INVALID_PAGE_HTML', errors);
  validateEnum(page.status, `${path}.status`, 'INVALID_PAGE_STATUS', errors, ['published', 'draft']);
}

function validatePreviewCategory(category, path, errors) {
  validateClosedObject(category, path, errors, ['id', 'name', 'slug', 'description', 'postCount']);
  if (!isObject(category)) {
    return;
  }

  validateNonEmptyString(category.id, `${path}.id`, 'INVALID_CATEGORY_ID', errors);
  validateNonEmptyString(category.name, `${path}.name`, 'INVALID_CATEGORY_NAME', errors);
  validateNonEmptyString(category.slug, `${path}.slug`, 'INVALID_CATEGORY_SLUG', errors);
  validateInteger(category.postCount, `${path}.postCount`, 'INVALID_CATEGORY_POST_COUNT', errors, { minimum: 0 });
  if (category.description !== undefined) {
    validateString(category.description, `${path}.description`, 'INVALID_CATEGORY_DESCRIPTION', errors);
  }
}

function validatePreviewTag(tag, path, errors) {
  validateClosedObject(tag, path, errors, ['id', 'name', 'slug', 'postCount']);
  if (!isObject(tag)) {
    return;
  }

  validateNonEmptyString(tag.id, `${path}.id`, 'INVALID_TAG_ID', errors);
  validateNonEmptyString(tag.name, `${path}.name`, 'INVALID_TAG_NAME', errors);
  validateNonEmptyString(tag.slug, `${path}.slug`, 'INVALID_TAG_SLUG', errors);
  validateInteger(tag.postCount, `${path}.postCount`, 'INVALID_TAG_POST_COUNT', errors, { minimum: 0 });
}

function validateIndexRoute(route, path, errors) {
  validatePaginatedRoute(route, path, errors, {
    allowedKeys: ['path', 'page', 'totalPages', 'posts', 'pagination', 'categories', 'tags'],
    requiredKeys: ['path', 'page', 'totalPages', 'posts', 'pagination', 'categories', 'tags'],
    routeCodePrefix: 'INDEX_ROUTE',
  });
}

function validateArchiveRoute(route, path, errors) {
  validatePaginatedRoute(route, path, errors, {
    allowedKeys: ['path', 'page', 'totalPages', 'posts', 'pagination'],
    requiredKeys: ['path', 'page', 'totalPages', 'posts', 'pagination'],
    routeCodePrefix: 'ARCHIVE_ROUTE',
  });
}

function validateCategoryRoute(route, path, errors) {
  validatePaginatedRoute(route, path, errors, {
    allowedKeys: ['path', 'page', 'totalPages', 'slug', 'posts', 'pagination', 'categories'],
    requiredKeys: ['path', 'page', 'totalPages', 'slug', 'posts', 'pagination'],
    routeCodePrefix: 'CATEGORY_ROUTE',
  });
}

function validateTagRoute(route, path, errors) {
  validatePaginatedRoute(route, path, errors, {
    allowedKeys: ['path', 'page', 'totalPages', 'slug', 'posts', 'pagination', 'tags'],
    requiredKeys: ['path', 'page', 'totalPages', 'slug', 'posts', 'pagination'],
    routeCodePrefix: 'TAG_ROUTE',
  });
}

function validatePaginatedRoute(route, path, errors, options) {
  validateClosedObject(route, path, errors, options.allowedKeys);
  if (!isObject(route)) {
    return;
  }

  validateNonEmptyString(route.path, `${path}.path`, `INVALID_${options.routeCodePrefix}_PATH`, errors);
  validateInteger(route.page, `${path}.page`, `INVALID_${options.routeCodePrefix}_PAGE`, errors, { minimum: 1 });
  validateInteger(route.totalPages, `${path}.totalPages`, `INVALID_${options.routeCodePrefix}_TOTAL_PAGES`, errors, { minimum: 1 });
  validateString(route.posts, `${path}.posts`, `INVALID_${options.routeCodePrefix}_POSTS`, errors);
  validateString(route.pagination, `${path}.pagination`, `INVALID_${options.routeCodePrefix}_PAGINATION`, errors);

  if ('slug' in route) {
    validateNonEmptyString(route.slug, `${path}.slug`, `INVALID_${options.routeCodePrefix}_SLUG`, errors);
  }
  if (route.categories !== undefined) {
    validateString(route.categories, `${path}.categories`, `INVALID_${options.routeCodePrefix}_CATEGORIES`, errors);
  }
  if (route.tags !== undefined) {
    validateString(route.tags, `${path}.tags`, `INVALID_${options.routeCodePrefix}_TAGS`, errors);
  }
  if (Number.isInteger(route.page) && Number.isInteger(route.totalPages) && route.page > route.totalPages) {
    errors.push(issue(`INVALID_${options.routeCodePrefix}_PAGE`, `${path}.page`, 'Page cannot exceed totalPages'));
  }
}

function validateArray(value, path, code, errors, itemValidator) {
  if (!Array.isArray(value)) {
    errors.push(issue(code, path, 'Expected an array'));
    return;
  }

  value.forEach((entry, index) => itemValidator(entry, index));
}

function validateClosedObject(value, path, errors, allowedKeys) {
  validateObject(value, path, 'INVALID_OBJECT', errors);
  if (!isObject(value)) {
    return;
  }

  for (const key of Object.keys(value)) {
    if (!allowedKeys.includes(key)) {
      errors.push(issue('UNKNOWN_PROPERTY', path ? `${path}.${key}` : key, 'Unexpected property'));
    }
  }

  for (const key of allowedKeys) {
    if (!(key in value) && !isOptionalKey(path, key)) {
      errors.push(issue('MISSING_REQUIRED_PROPERTY', path ? `${path}.${key}` : key, 'Missing required property'));
    }
  }
}

function isOptionalKey(path, key) {
  if (path === 'site') return key === 'logo' || key === 'social';
  if (path.startsWith('content.posts[')) return key === 'author_avatar' || key === 'featured_image';
  if (path.startsWith('content.categories[')) return key === 'description';
  if (path.startsWith('routes.categories[')) return key === 'categories';
  if (path.startsWith('routes.tags[')) return key === 'tags';
  return false;
}

function validateObject(value, path, code, errors) {
  if (!isObject(value)) {
    errors.push(issue(code, path, 'Expected an object'));
  }
}

function validateLiteral(value, literal, path, code, errors) {
  if (value !== literal) {
    errors.push(issue(code, path, `Expected literal value "${literal}"`));
  }
}

function validateNonEmptyString(value, path, code, errors) {
  if (typeof value !== 'string' || value.trim() === '') {
    errors.push(issue(code, path, 'Expected a non-empty string'));
  }
}

function validateString(value, path, code, errors) {
  if (typeof value !== 'string') {
    errors.push(issue(code, path, 'Expected a string'));
  }
}

function validateInteger(value, path, code, errors, options = {}) {
  if (!Number.isInteger(value)) {
    errors.push(issue(code, path, 'Expected an integer'));
    return;
  }

  if (options.minimum !== undefined && value < options.minimum) {
    errors.push(issue(code, path, `Expected integer >= ${options.minimum}`));
  }
}

function validateEnum(value, path, code, errors, allowedValues) {
  if (!allowedValues.includes(value)) {
    errors.push(issue(code, path, `Expected one of: ${allowedValues.join(', ')}`));
  }
}

function validateDateTimeString(value, path, code, errors) {
  if (typeof value !== 'string' || value.trim() === '') {
    errors.push(issue(code, path, 'Expected a date-time string'));
    return;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    errors.push(issue(code, path, 'Expected a valid date-time string'));
  }
}

function validateUri(value, path, code, errors) {
  if (typeof value !== 'string' || value.trim() === '') {
    errors.push(issue(code, path, 'Expected a URI string'));
    return;
  }

  try {
    new URL(value);
  } catch {
    errors.push(issue(code, path, 'Expected a valid URI'));
  }
}

function issue(code, path, message) {
  return {
    code,
    path,
    message,
    severity: 'error',
  };
}

function isObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
