export const PREVIEW_DATA_VERSION = '0.5';

const PREVIEW_DOCUMENT_TYPES = ['plaintext', 'markdown', 'html'];

export function validatePreviewData(data) {
  const errors = [];

  validateClosedObject(data, '', errors, ['version', 'generator', 'generated_at', 'site', 'content']);

  if (isObject(data)) {
    validateLiteral(data.version, PREVIEW_DATA_VERSION, 'version', 'INVALID_VERSION', errors);
    validateNonEmptyString(data.generator, 'generator', 'INVALID_GENERATOR', errors);
    validateDateTimeString(data.generated_at, 'generated_at', 'INVALID_GENERATED_AT', errors);

    validateSite(data.site, 'site', errors);
    validateContent(data.content, 'content', errors);
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
  validateSiteUri(site.url, `${path}.url`, 'INVALID_SITE_URL', errors);
  validateSiteUri(site.mediaBaseUrl, `${path}.mediaBaseUrl`, 'INVALID_SITE_MEDIA_BASE_URL', errors);
  validateNonEmptyString(site.locale, `${path}.locale`, 'INVALID_SITE_LOCALE', errors);
  validateInteger(site.postsPerPage, `${path}.postsPerPage`, 'INVALID_SITE_POSTS_PER_PAGE', errors, { minimum: 1 });
  validateNonEmptyString(site.dateFormat, `${path}.dateFormat`, 'INVALID_SITE_DATE_FORMAT', errors);
  validateString(site.timeFormat, `${path}.timeFormat`, 'INVALID_SITE_TIME_FORMAT', errors);
  validateNonEmptyString(site.timezone, `${path}.timezone`, 'INVALID_SITE_TIMEZONE', errors);
  validateBoolean(site.disallowComments, `${path}.disallowComments`, 'INVALID_SITE_DISALLOW_COMMENTS', errors);

  rejectLegacyKeys(site, path, errors, [
    'site_name',
    'site_description',
    'site_url',
    'metadata',
    'media_delivery_mode',
    'media_delivery_base_url',
    'language',
    'siteLocale',
    'siteTimezone',
    'site_timezone',
    'site_locale',
  ], 'INVALID_LEGACY_SITE_FIELD');
}

function validateContent(content, path, errors) {
  validateClosedObject(content, path, errors, ['authors', 'posts', 'pages', 'categories', 'tags']);
  if (!isObject(content)) {
    return;
  }

  const authorIds = validateAuthorArray(content.authors, `${path}.authors`, errors);

  validateArray(content.posts, `${path}.posts`, 'INVALID_POSTS', errors, (entry, index) => {
    validatePreviewPost(entry, `${path}.posts[${index}]`, errors, authorIds);
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

function validateAuthorArray(value, path, errors) {
  const ids = new Set();

  validateArray(value, path, 'INVALID_AUTHORS', errors, (entry, index) => {
    validatePreviewAuthor(entry, `${path}[${index}]`, errors);

    if (!isObject(entry) || typeof entry.id !== 'string' || entry.id.trim() === '') {
      return;
    }

    if (ids.has(entry.id)) {
      errors.push(issue('DUPLICATE_AUTHOR_ID', `${path}[${index}].id`, 'Author ids must be unique'));
      return;
    }

    ids.add(entry.id);
  });

  return ids;
}

function validatePreviewAuthor(author, path, errors) {
  validateClosedObject(author, path, errors, ['id', 'display_name', 'avatar']);
  if (!isObject(author)) {
    return;
  }

  validateNonEmptyString(author.id, `${path}.id`, 'INVALID_AUTHOR_ID', errors);
  validateNonEmptyString(author.display_name, `${path}.display_name`, 'INVALID_AUTHOR_DISPLAY_NAME', errors);

  if (author.avatar !== undefined) {
    validateUrlLike(author.avatar, `${path}.avatar`, 'INVALID_AUTHOR_AVATAR', errors);
  }
}

function validatePreviewPost(post, path, errors, authorIds) {
  validateClosedObject(post, path, errors, [
    'id',
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
    'status',
    'allow_comments',
    'category_slugs',
    'tag_slugs',
  ]);
  if (!isObject(post)) {
    return;
  }

  validateNonEmptyString(post.id, `${path}.id`, 'INVALID_POST_ID', errors);
  validateInteger(post.public_id, `${path}.public_id`, 'INVALID_POST_PUBLIC_ID', errors, { minimum: 1 });
  validateNonEmptyString(post.title, `${path}.title`, 'INVALID_POST_TITLE', errors);
  validateNonEmptyString(post.slug, `${path}.slug`, 'INVALID_POST_SLUG', errors);
  validateString(post.content, `${path}.content`, 'INVALID_POST_CONTENT', errors);
  validateEnum(post.document_type, `${path}.document_type`, 'INVALID_POST_DOCUMENT_TYPE', errors, PREVIEW_DOCUMENT_TYPES);
  validateString(post.excerpt, `${path}.excerpt`, 'INVALID_POST_EXCERPT', errors);
  validateDateTimeString(post.published_at_iso, `${path}.published_at_iso`, 'INVALID_POST_PUBLISHED_AT_ISO', errors);
  validateDateTimeString(post.updated_at_iso, `${path}.updated_at_iso`, 'INVALID_POST_UPDATED_AT_ISO', errors);
  validateNonEmptyString(post.author_id, `${path}.author_id`, 'INVALID_POST_AUTHOR_ID', errors);
  validateEnum(post.status, `${path}.status`, 'INVALID_POST_STATUS', errors, ['published', 'draft']);
  validateBoolean(post.allow_comments, `${path}.allow_comments`, 'INVALID_POST_ALLOW_COMMENTS', errors);
  validateSlugArray(post.category_slugs, `${path}.category_slugs`, 'INVALID_POST_CATEGORY_SLUGS', errors);
  validateSlugArray(post.tag_slugs, `${path}.tag_slugs`, 'INVALID_POST_TAG_SLUGS', errors);

  if (post.featured_image !== undefined) {
    validateUrlLike(post.featured_image, `${path}.featured_image`, 'INVALID_POST_FEATURED_IMAGE', errors);
  }

  if (typeof post.author_id === 'string' && post.author_id.trim() !== '' && !authorIds.has(post.author_id)) {
    errors.push(issue('INVALID_POST_AUTHOR_REFERENCE', `${path}.author_id`, 'Referenced author_id does not exist'));
  }
}

function validatePreviewPage(page, path, errors) {
  validateClosedObject(page, path, errors, ['id', 'title', 'slug', 'content', 'document_type', 'excerpt', 'featured_image', 'status']);
  if (!isObject(page)) {
    return;
  }

  validateNonEmptyString(page.id, `${path}.id`, 'INVALID_PAGE_ID', errors);
  validateNonEmptyString(page.title, `${path}.title`, 'INVALID_PAGE_TITLE', errors);
  validateNonEmptyString(page.slug, `${path}.slug`, 'INVALID_PAGE_SLUG', errors);
  validateString(page.content, `${path}.content`, 'INVALID_PAGE_CONTENT', errors);
  validateEnum(page.document_type, `${path}.document_type`, 'INVALID_PAGE_DOCUMENT_TYPE', errors, PREVIEW_DOCUMENT_TYPES);
  if (page.excerpt !== undefined) {
    validateString(page.excerpt, `${path}.excerpt`, 'INVALID_PAGE_EXCERPT', errors);
  }
  if (page.featured_image !== undefined) {
    validateUrlLike(page.featured_image, `${path}.featured_image`, 'INVALID_PAGE_FEATURED_IMAGE', errors);
  }
  validateEnum(page.status, `${path}.status`, 'INVALID_PAGE_STATUS', errors, ['published', 'draft']);
}

function validatePreviewCategory(category, path, errors) {
  validateClosedObject(category, path, errors, ['id', 'name', 'slug', 'description']);
  if (!isObject(category)) {
    return;
  }

  validateNonEmptyString(category.id, `${path}.id`, 'INVALID_CATEGORY_ID', errors);
  validateNonEmptyString(category.name, `${path}.name`, 'INVALID_CATEGORY_NAME', errors);
  validateNonEmptyString(category.slug, `${path}.slug`, 'INVALID_CATEGORY_SLUG', errors);
  if (category.description !== undefined) {
    validateString(category.description, `${path}.description`, 'INVALID_CATEGORY_DESCRIPTION', errors);
  }
}

function validatePreviewTag(tag, path, errors) {
  validateClosedObject(tag, path, errors, ['id', 'name', 'slug', 'description']);
  if (!isObject(tag)) {
    return;
  }

  validateNonEmptyString(tag.id, `${path}.id`, 'INVALID_TAG_ID', errors);
  validateNonEmptyString(tag.name, `${path}.name`, 'INVALID_TAG_NAME', errors);
  validateNonEmptyString(tag.slug, `${path}.slug`, 'INVALID_TAG_SLUG', errors);
  if (tag.description !== undefined) {
    validateString(tag.description, `${path}.description`, 'INVALID_TAG_DESCRIPTION', errors);
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
    if (!allowedKeys.includes(key) && !isSiteExtensionKey(path, key)) {
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
  if (path.startsWith('content.authors[')) {
    return key === 'avatar';
  }
  if (path.startsWith('content.posts[')) {
    return key === 'featured_image';
  }
  if (path.startsWith('content.pages[')) {
    return key === 'excerpt' || key === 'featured_image';
  }
  if (path.startsWith('content.categories[') || path.startsWith('content.tags[')) {
    return key === 'description';
  }
  return false;
}

function isSiteExtensionKey(path, key) {
  if (path !== 'site') {
    return false;
  }

  return ![
    'site_name',
    'site_description',
    'site_url',
    'metadata',
    'media_delivery_mode',
    'media_delivery_base_url',
    'site_timezone',
    'site_locale',
  ].includes(key);
}

function validateSlugArray(value, path, code, errors) {
  if (!Array.isArray(value)) {
    errors.push(issue(code, path, 'Expected an array'));
    return;
  }

  for (const [index, entry] of value.entries()) {
    validateNonEmptyString(entry, `${path}[${index}]`, code, errors);
  }
}

function rejectLegacyKeys(value, path, errors, keys, code) {
  for (const key of keys) {
    if (key in value) {
      errors.push(issue(code, `${path}.${key}`, 'Legacy field is not allowed in preview-data v0.5'));
    }
  }
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

function validateBoolean(value, path, code, errors) {
  if (typeof value !== 'boolean') {
    errors.push(issue(code, path, 'Expected a boolean'));
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
    const url = new URL(value);
    if (!url.protocol || !url.hostname) {
      errors.push(issue(code, path, 'Expected an absolute URI'));
    }
  } catch {
    errors.push(issue(code, path, 'Expected a valid URI'));
  }
}

function validateSiteUri(value, path, code, errors) {
  if (value === '') {
    return;
  }

  validateUri(value, path, code, errors);
}

function validateUrlLike(value, path, code, errors) {
  if (typeof value !== 'string' || value.trim() === '') {
    errors.push(issue(code, path, 'Expected a URL-like string'));
    return;
  }

  const trimmed = value.trim();
  if (trimmed.startsWith('//')) {
    errors.push(issue(code, path, 'Expected an absolute URI or a safe relative path'));
    return;
  }

  if (trimmed.startsWith('/') || trimmed.startsWith('./') || trimmed.startsWith('../')) {
    return;
  }

  validateUri(trimmed, path, code, errors);
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
