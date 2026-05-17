import { SLUG_SEGMENT_ISSUE_CODES, validateSlugSegment as validateSharedSlugSegment } from '@zeropress/slug-policy';

export const PREVIEW_DATA_VERSION = '0.6';

const PREVIEW_DOCUMENT_TYPES = ['plaintext', 'markdown', 'html'];
const PREVIEW_MENU_ITEM_TYPES = ['custom', 'page', 'post', 'category'];
const PREVIEW_MENU_TARGETS = ['_self', '_blank'];
const PREVIEW_MENU_ID_PATTERN = /^[a-z][a-z0-9_-]{0,63}$/;
const PREVIEW_WIDGET_AREA_ID_PATTERN = /^[a-z][a-z0-9_-]{0,63}$/;
const PREVIEW_COLLECTION_ID_PATTERN = /^[a-z][a-z0-9_-]{0,63}$/;
const PREVIEW_COLLECTION_ITEM_TYPES = ['post', 'page'];
const PREVIEW_MEDIA_DELIVERY_MODES = ['none', 'media_domain'];
const PREVIEW_DATETIME_DISPLAY_MODES = ['static', 'client'];
const PREVIEW_DATETIME_STYLES = ['none', 'short', 'medium', 'long', 'full'];
const PREVIEW_PERMALINK_OUTPUT_STYLES = ['directory', 'html-extension'];
const PREVIEW_PERMALINK_FIELDS = ['posts', 'pages', 'categories', 'tags'];
const PREVIEW_FRONT_PAGE_TYPES = ['theme_index', 'page', 'standalone_html'];
const PREVIEW_DATA_KEY_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_]*(?:-[a-zA-Z0-9_]+)*$/;
const PREVIEW_DATA_MAX_DEPTH = 4;
const PREVIEW_DATA_MAX_KEYS = 64;
const PREVIEW_DATA_MAX_ARRAY_LENGTH = 256;
const PREVIEW_PERMALINK_TOKENS = Object.freeze({
  posts: new Set(['slug', 'public_id', 'year', 'month', 'day']),
  pages: new Set(['slug']),
  categories: new Set(['slug']),
  tags: new Set(['slug']),
});

export function validatePreviewData(data) {
  const errors = [];

  validateClosedObject(data, '', errors, ['$schema', 'version', 'generator', 'generated_at', 'site', 'content', 'menus', 'widgets', 'collections', 'custom_css', 'custom_html']);

  if (isObject(data)) {
    if (data.$schema !== undefined) {
      validateString(data.$schema, '$schema', 'INVALID_SCHEMA_HINT', errors);
    }
    validateLiteral(data.version, PREVIEW_DATA_VERSION, 'version', 'INVALID_VERSION', errors);
    validateNonEmptyString(data.generator, 'generator', 'INVALID_GENERATOR', errors);
    validateDateTimeString(data.generated_at, 'generated_at', 'INVALID_GENERATED_AT', errors);

    validateSite(data.site, 'site', errors);
    validateContent(data.content, 'content', errors);
    if (data.menus !== undefined) {
      validateMenus(data.menus, 'menus', errors);
    }
    if (data.widgets !== undefined) {
      validateWidgets(data.widgets, 'widgets', errors);
    }
    if (data.collections !== undefined) {
      validateCollections(data.collections, 'collections', errors);
    }
    if (data.custom_css !== undefined) {
      validateCustomCss(data.custom_css, 'custom_css', errors);
    }
    if (data.custom_html !== undefined) {
      validateCustomHtml(data.custom_html, 'custom_html', errors);
    }
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
  validateClosedObject(site, path, errors, [
    'title',
    'description',
    'url',
    'media_base_url',
    'media_delivery_mode',
    'favicon',
    'expose_generator',
    'locale',
    'posts_per_page',
    'datetime_display',
    'date_style',
    'time_style',
    'timezone',
    'disallow_comments',
    'indexing',
    'permalinks',
    'front_page',
    'post_index',
    'footer',
    'meta',
  ]);
  if (!isObject(site)) {
    return;
  }

  validateNonEmptyString(site.title, `${path}.title`, 'INVALID_SITE_TITLE', errors);
  validateString(site.description, `${path}.description`, 'INVALID_SITE_DESCRIPTION', errors);
  validateSiteUri(site.url, `${path}.url`, 'INVALID_SITE_URL', errors);
  validateSiteUri(site.media_base_url, `${path}.media_base_url`, 'INVALID_SITE_MEDIA_BASE_URL', errors);
  if (site.media_delivery_mode !== undefined) {
    validateEnum(site.media_delivery_mode, `${path}.media_delivery_mode`, 'INVALID_SITE_MEDIA_DELIVERY_MODE', errors, PREVIEW_MEDIA_DELIVERY_MODES);
  }
  if (site.favicon !== undefined) {
    validateSiteFavicon(site.favicon, `${path}.favicon`, errors);
  }
  if (site.expose_generator !== undefined) {
    validateBoolean(site.expose_generator, `${path}.expose_generator`, 'INVALID_SITE_EXPOSE_GENERATOR', errors);
  }
  validateNonEmptyString(site.locale, `${path}.locale`, 'INVALID_SITE_LOCALE', errors);
  validateInteger(site.posts_per_page, `${path}.posts_per_page`, 'INVALID_SITE_POSTS_PER_PAGE', errors, { minimum: 1 });
  validateEnum(site.datetime_display, `${path}.datetime_display`, 'INVALID_SITE_DATETIME_DISPLAY', errors, PREVIEW_DATETIME_DISPLAY_MODES);
  validateEnum(site.date_style, `${path}.date_style`, 'INVALID_SITE_DATE_STYLE', errors, PREVIEW_DATETIME_STYLES);
  validateEnum(site.time_style, `${path}.time_style`, 'INVALID_SITE_TIME_STYLE', errors, PREVIEW_DATETIME_STYLES);
  validateNonEmptyString(site.timezone, `${path}.timezone`, 'INVALID_SITE_TIMEZONE', errors);
  validateBoolean(site.disallow_comments, `${path}.disallow_comments`, 'INVALID_SITE_DISALLOW_COMMENTS', errors);
  if (site.indexing !== undefined) {
    validateBoolean(site.indexing, `${path}.indexing`, 'INVALID_SITE_INDEXING', errors);
  }
  validatePermalinks(site.permalinks, `${path}.permalinks`, errors);
  validateFrontPage(site.front_page, `${path}.front_page`, errors);
  validatePostIndex(site.post_index, `${path}.post_index`, errors);
  validatePreviewMeta(site.meta, `${path}.meta`, errors);
  if (site.footer !== undefined) {
    validateSiteFooter(site.footer, `${path}.footer`, errors);
  }

  rejectLegacyKeys(site, path, errors, [
    'site_name',
    'site_description',
    'site_url',
    'metadata',
    'media_delivery_base_url',
    'language',
    'siteLocale',
    'siteTimezone',
    'site_timezone',
    'site_locale',
  ], 'INVALID_LEGACY_SITE_FIELD');
}

function validateContent(content, path, errors) {
  validateClosedObject(content, path, errors, ['authors', 'posts', 'pages', 'categories', 'tags', 'media']);
  if (!isObject(content)) {
    return;
  }

  const authorIds = validateAuthorArray(content.authors, `${path}.authors`, errors);

  validatePostArray(content.posts, `${path}.posts`, errors, authorIds);
  validateArray(content.pages, `${path}.pages`, 'INVALID_PAGES', errors, (entry, index) => {
    validatePreviewPage(entry, `${path}.pages[${index}]`, errors);
  });
  validateArray(content.categories, `${path}.categories`, 'INVALID_CATEGORIES', errors, (entry, index) => {
    validatePreviewCategory(entry, `${path}.categories[${index}]`, errors);
  });
  validateArray(content.tags, `${path}.tags`, 'INVALID_TAGS', errors, (entry, index) => {
    validatePreviewTag(entry, `${path}.tags[${index}]`, errors);
  });
  if (content.media !== undefined) {
    validateMediaArray(content.media, `${path}.media`, errors);
  }
}

function validateSiteFooter(footer, path, errors) {
  validateClosedObject(footer, path, errors, ['copyright_text', 'attribution']);
  if (!isObject(footer)) {
    return;
  }

  if (footer.copyright_text !== undefined) {
    validateNonEmptyString(footer.copyright_text, `${path}.copyright_text`, 'INVALID_SITE_FOOTER_COPYRIGHT_TEXT', errors);
  }

  if (footer.attribution !== undefined) {
    validateBoolean(footer.attribution, `${path}.attribution`, 'INVALID_SITE_FOOTER_ATTRIBUTION', errors);
  }
}

function validateMenus(menus, path, errors) {
  validateObject(menus, path, 'INVALID_MENUS', errors);
  if (!isObject(menus)) {
    return;
  }

  for (const [menuId, menu] of Object.entries(menus)) {
    if (!PREVIEW_MENU_ID_PATTERN.test(menuId)) {
      errors.push(issue('INVALID_MENU_ID', `${path}.${menuId}`, 'Menu ids must match ^[a-z][a-z0-9_-]{0,63}$'));
    }

    validatePreviewMenu(menu, `${path}.${menuId}`, errors);
  }
}

function validatePreviewMenu(menu, path, errors) {
  validateClosedObject(menu, path, errors, ['name', 'items']);
  if (!isObject(menu)) {
    return;
  }

  validateNonEmptyString(menu.name, `${path}.name`, 'INVALID_MENU_NAME', errors);
  validateArray(menu.items, `${path}.items`, 'INVALID_MENU_ITEMS', errors, (entry, index) => {
    validatePreviewMenuItem(entry, `${path}.items[${index}]`, errors);
  });
}

function validatePreviewMenuItem(item, path, errors) {
  validateClosedObject(item, path, errors, ['title', 'url', 'type', 'target', 'meta', 'children']);
  if (!isObject(item)) {
    return;
  }

  validateNonEmptyString(item.title, `${path}.title`, 'INVALID_MENU_ITEM_TITLE', errors);
  validateUrlLike(item.url, `${path}.url`, 'INVALID_MENU_ITEM_URL', errors);
  validateEnum(item.type, `${path}.type`, 'INVALID_MENU_ITEM_TYPE', errors, PREVIEW_MENU_ITEM_TYPES);
  validateEnum(item.target, `${path}.target`, 'INVALID_MENU_ITEM_TARGET', errors, PREVIEW_MENU_TARGETS);
  validatePreviewMeta(item.meta, `${path}.meta`, errors);
  validateArray(item.children, `${path}.children`, 'INVALID_MENU_ITEM_CHILDREN', errors, (entry, index) => {
    validatePreviewMenuItem(entry, `${path}.children[${index}]`, errors);
  });

  rejectLegacyKeys(item, path, errors, ['label', 'open_in_new_tab', 'reference_id', 'reference_exists', 'id'], 'INVALID_LEGACY_MENU_FIELD');
}

function validateWidgets(widgets, path, errors) {
  validateObject(widgets, path, 'INVALID_WIDGETS', errors);
  if (!isObject(widgets)) {
    return;
  }

  for (const [widgetAreaId, widgetArea] of Object.entries(widgets)) {
    if (!PREVIEW_WIDGET_AREA_ID_PATTERN.test(widgetAreaId)) {
      errors.push(issue('INVALID_WIDGET_AREA_ID', `${path}.${widgetAreaId}`, 'Widget area ids must match ^[a-z][a-z0-9_-]{0,63}$'));
    }

    validatePreviewWidgetArea(widgetArea, `${path}.${widgetAreaId}`, errors);
  }
}

function validateCollections(collections, path, errors) {
  validateObject(collections, path, 'INVALID_COLLECTIONS', errors);
  if (!isObject(collections)) {
    return;
  }

  for (const [collectionId, collection] of Object.entries(collections)) {
    if (!PREVIEW_COLLECTION_ID_PATTERN.test(collectionId)) {
      errors.push(issue('INVALID_COLLECTION_ID', `${path}.${collectionId}`, 'Collection ids must match ^[a-z][a-z0-9_-]{0,63}$'));
    }

    validatePreviewCollection(collection, `${path}.${collectionId}`, errors);
  }
}

function validatePreviewCollection(collection, path, errors) {
  validateClosedObject(collection, path, errors, ['title', 'description', 'items']);
  if (!isObject(collection)) {
    return;
  }

  if (collection.title !== undefined) {
    validateNonEmptyString(collection.title, `${path}.title`, 'INVALID_COLLECTION_TITLE', errors);
  }
  if (collection.description !== undefined) {
    validateString(collection.description, `${path}.description`, 'INVALID_COLLECTION_DESCRIPTION', errors);
  }

  const seenItems = new Set();
  validateArray(collection.items, `${path}.items`, 'INVALID_COLLECTION_ITEMS', errors, (entry, index) => {
    validatePreviewCollectionItem(entry, `${path}.items[${index}]`, errors, seenItems);
  });
}

function validatePreviewCollectionItem(item, path, errors, seenItems) {
  validateClosedObject(item, path, errors, ['type', 'slug']);
  if (!isObject(item)) {
    return;
  }

  validateEnum(item.type, `${path}.type`, 'INVALID_COLLECTION_ITEM_TYPE', errors, PREVIEW_COLLECTION_ITEM_TYPES);
  validateSlugSegment(item.slug, `${path}.slug`, 'INVALID_COLLECTION_ITEM_SLUG', errors);

  if (typeof item.type === 'string' && PREVIEW_COLLECTION_ITEM_TYPES.includes(item.type) && typeof item.slug === 'string') {
    const key = `${item.type}:${item.slug}`;
    if (seenItems.has(key)) {
      errors.push(issue('DUPLICATE_COLLECTION_ITEM', `${path}.slug`, 'Duplicate collection item in the same collection'));
    }
    seenItems.add(key);
  }
}

function validatePreviewWidgetArea(widgetArea, path, errors) {
  validateClosedObject(widgetArea, path, errors, ['name', 'items']);
  if (!isObject(widgetArea)) {
    return;
  }

  validateNonEmptyString(widgetArea.name, `${path}.name`, 'INVALID_WIDGET_AREA_NAME', errors);
  validateArray(widgetArea.items, `${path}.items`, 'INVALID_WIDGET_AREA_ITEMS', errors, (entry, index) => {
    validatePreviewWidgetItem(entry, `${path}.items[${index}]`, errors);
  });
}

function validatePreviewWidgetItem(item, path, errors) {
  validateClosedObject(item, path, errors, ['type', 'title', 'settings']);
  if (!isObject(item)) {
    return;
  }

  validateNonEmptyString(item.type, `${path}.type`, 'INVALID_WIDGET_ITEM_TYPE', errors);
  validateNonEmptyString(item.title, `${path}.title`, 'INVALID_WIDGET_ITEM_TITLE', errors);

  if (item.settings !== undefined) {
    validateObject(item.settings, `${path}.settings`, 'INVALID_WIDGET_ITEM_SETTINGS', errors);
  }
}

function validateCustomCss(customCss, path, errors) {
  validateClosedObject(customCss, path, errors, ['content']);
  if (!isObject(customCss)) {
    return;
  }

  validateNonEmptyString(customCss.content, `${path}.content`, 'INVALID_CUSTOM_CSS_CONTENT', errors);
}

function validateCustomHtml(customHtml, path, errors) {
  validateClosedObject(customHtml, path, errors, ['head_end', 'body_end']);
  if (!isObject(customHtml)) {
    return;
  }

  if (customHtml.head_end === undefined && customHtml.body_end === undefined) {
    errors.push(issue('INVALID_CUSTOM_HTML', path, 'custom_html must include head_end or body_end'));
  }

  if (customHtml.head_end !== undefined) {
    validateCustomHtmlSlot(customHtml.head_end, `${path}.head_end`, errors);
  }
  if (customHtml.body_end !== undefined) {
    validateCustomHtmlSlot(customHtml.body_end, `${path}.body_end`, errors);
  }
}

function validateCustomHtmlSlot(slot, path, errors) {
  validateClosedObject(slot, path, errors, ['content']);
  if (!isObject(slot)) {
    errors.push(issue('INVALID_CUSTOM_HTML_SLOT', path, 'Expected an object'));
    return;
  }

  validateNonEmptyString(slot.content, `${path}.content`, 'INVALID_CUSTOM_HTML_CONTENT', errors);
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

function validatePostArray(value, path, errors, authorIds) {
  const publicIds = new Set();

  validateArray(value, path, 'INVALID_POSTS', errors, (entry, index) => {
    validatePreviewPost(entry, `${path}[${index}]`, errors, authorIds);

    if (!isObject(entry) || !Number.isInteger(entry.public_id) || entry.public_id <= 0) {
      return;
    }

    if (publicIds.has(entry.public_id)) {
      errors.push(issue('DUPLICATE_POST_PUBLIC_ID', `${path}[${index}].public_id`, 'Post public_id values must be unique'));
      return;
    }

    publicIds.add(entry.public_id);
  });
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

function validateMediaArray(value, path, errors) {
  const sources = new Set();

  validateArray(value, path, 'INVALID_MEDIA', errors, (entry, index) => {
    validatePreviewMedia(entry, `${path}[${index}]`, errors);

    if (!isObject(entry) || typeof entry.src !== 'string') {
      return;
    }

    if (sources.has(entry.src)) {
      errors.push(issue('DUPLICATE_MEDIA_SRC', `${path}[${index}].src`, 'Media src values must be unique'));
      return;
    }

    sources.add(entry.src);
  });
}

function validateSiteFavicon(favicon, path, errors) {
  validateClosedObject(favicon, path, errors, ['icon', 'svg', 'png', 'apple_touch_icon']);
  if (!isObject(favicon)) {
    return;
  }

  if (
    favicon.icon === undefined &&
    favicon.svg === undefined &&
    favicon.png === undefined &&
    favicon.apple_touch_icon === undefined
  ) {
    errors.push(issue('INVALID_SITE_FAVICON', path, 'site.favicon must include at least one favicon URL'));
  }

  for (const key of ['icon', 'svg', 'png', 'apple_touch_icon']) {
    if (favicon[key] !== undefined) {
      validateUrlLike(favicon[key], `${path}.${key}`, 'INVALID_SITE_FAVICON_URL', errors);
    }
  }
}

function validatePreviewMedia(media, path, errors) {
  validateClosedObject(media, path, errors, ['src', 'width', 'height', 'alt']);
  if (!isObject(media)) {
    return;
  }

  validateUrlLike(media.src, `${path}.src`, 'INVALID_MEDIA_SRC', errors);
  validateInteger(media.width, `${path}.width`, 'INVALID_MEDIA_WIDTH', errors, { minimum: 1 });
  validateInteger(media.height, `${path}.height`, 'INVALID_MEDIA_HEIGHT', errors, { minimum: 1 });
  if (media.alt !== undefined) {
    validateString(media.alt, `${path}.alt`, 'INVALID_MEDIA_ALT', errors);
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
    'meta',
    'data',
    'status',
    'allow_comments',
    'category_slugs',
    'tag_slugs',
  ]);
  if (!isObject(post)) {
    return;
  }

  validateInteger(post.public_id, `${path}.public_id`, 'INVALID_POST_PUBLIC_ID', errors, { minimum: 1 });
  validateNonEmptyString(post.title, `${path}.title`, 'INVALID_POST_TITLE', errors);
  validateSlugSegment(post.slug, `${path}.slug`, 'INVALID_POST_SLUG', errors);
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
  validatePreviewMeta(post.meta, `${path}.meta`, errors);
  validatePreviewStructuredData(post.data, `${path}.data`, errors);

  if (typeof post.author_id === 'string' && post.author_id.trim() !== '' && !authorIds.has(post.author_id)) {
    errors.push(issue('INVALID_POST_AUTHOR_REFERENCE', `${path}.author_id`, 'Referenced author_id does not exist'));
  }
}

function validatePreviewPage(page, path, errors) {
  validateClosedObject(page, path, errors, ['title', 'slug', 'path', 'content', 'document_type', 'excerpt', 'featured_image', 'meta', 'data', 'status']);
  if (!isObject(page)) {
    return;
  }

  validateNonEmptyString(page.title, `${path}.title`, 'INVALID_PAGE_TITLE', errors);
  validateSlugSegment(page.slug, `${path}.slug`, 'INVALID_PAGE_SLUG', errors);
  validatePagePath(page.path, `${path}.path`, errors);
  validateString(page.content, `${path}.content`, 'INVALID_PAGE_CONTENT', errors);
  validateEnum(page.document_type, `${path}.document_type`, 'INVALID_PAGE_DOCUMENT_TYPE', errors, PREVIEW_DOCUMENT_TYPES);
  if (page.excerpt !== undefined) {
    validateString(page.excerpt, `${path}.excerpt`, 'INVALID_PAGE_EXCERPT', errors);
  }
  if (page.featured_image !== undefined) {
    validateUrlLike(page.featured_image, `${path}.featured_image`, 'INVALID_PAGE_FEATURED_IMAGE', errors);
  }
  validatePreviewMeta(page.meta, `${path}.meta`, errors);
  validatePreviewStructuredData(page.data, `${path}.data`, errors);
  validateEnum(page.status, `${path}.status`, 'INVALID_PAGE_STATUS', errors, ['published', 'draft']);
}

function validatePreviewMeta(meta, path, errors) {
  if (meta === undefined) {
    return;
  }
  if (!isObject(meta)) {
    errors.push(issue('INVALID_META', path, 'meta must be an object'));
    return;
  }

  for (const [key, value] of Object.entries(meta)) {
    if (value === null || typeof value === 'string' || typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value))) {
      continue;
    }
    errors.push(issue('INVALID_META_VALUE', `${path}.${key}`, 'meta values must be strings, numbers, booleans, or null'));
  }
}

function validatePreviewStructuredData(data, path, errors) {
  if (data === undefined) {
    return;
  }
  if (!isObject(data)) {
    errors.push(issue('INVALID_DATA', path, 'data must be an object'));
    return;
  }

  validatePreviewDataObject(data, path, errors, 0);
}

function validatePreviewDataValue(value, path, errors, depth) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return;
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      errors.push(issue('INVALID_DATA_VALUE', path, 'data numbers must be finite'));
    }
    return;
  }
  if (Array.isArray(value)) {
    validatePreviewDataArray(value, path, errors, depth);
    return;
  }
  if (isObject(value)) {
    validatePreviewDataObject(value, path, errors, depth);
    return;
  }

  errors.push(issue('INVALID_DATA_VALUE', path, 'data values must be JSON-safe strings, numbers, booleans, null, arrays, or objects'));
}

function validatePreviewDataObject(object, path, errors, depth) {
  if (depth > PREVIEW_DATA_MAX_DEPTH) {
    errors.push(issue('INVALID_DATA_DEPTH', path, `data nesting must not exceed ${PREVIEW_DATA_MAX_DEPTH} container levels`));
    return;
  }

  const entries = Object.entries(object);
  if (entries.length > PREVIEW_DATA_MAX_KEYS) {
    errors.push(issue('INVALID_DATA_OBJECT_SIZE', path, `data objects must not contain more than ${PREVIEW_DATA_MAX_KEYS} keys`));
  }

  for (const [key, value] of entries) {
    const childPath = `${path}.${key}`;
    if (!PREVIEW_DATA_KEY_PATTERN.test(key)) {
      errors.push(issue('INVALID_DATA_KEY', childPath, 'data keys must be valid template path segments'));
      continue;
    }
    validatePreviewDataValue(value, childPath, errors, depth + 1);
  }
}

function validatePreviewDataArray(array, path, errors, depth) {
  if (depth > PREVIEW_DATA_MAX_DEPTH) {
    errors.push(issue('INVALID_DATA_DEPTH', path, `data nesting must not exceed ${PREVIEW_DATA_MAX_DEPTH} container levels`));
    return;
  }

  if (array.length > PREVIEW_DATA_MAX_ARRAY_LENGTH) {
    errors.push(issue('INVALID_DATA_ARRAY_SIZE', path, `data arrays must not contain more than ${PREVIEW_DATA_MAX_ARRAY_LENGTH} items`));
  }

  array.forEach((value, index) => {
    validatePreviewDataValue(value, `${path}[${index}]`, errors, depth + 1);
  });
}

function validatePermalinks(permalinks, path, errors) {
  if (permalinks === undefined) {
    return;
  }
  validateClosedObject(permalinks, path, errors, ['output_style', ...PREVIEW_PERMALINK_FIELDS]);
  if (!isObject(permalinks)) {
    return;
  }

  if (permalinks.output_style !== undefined) {
    validateEnum(permalinks.output_style, `${path}.output_style`, 'INVALID_PERMALINK_OUTPUT_STYLE', errors, PREVIEW_PERMALINK_OUTPUT_STYLES);
  }

  for (const fieldName of PREVIEW_PERMALINK_FIELDS) {
    validatePermalinkPattern(permalinks[fieldName], `${path}.${fieldName}`, fieldName, errors);
  }
}

function validateFrontPage(frontPage, path, errors) {
  if (frontPage === undefined) {
    return;
  }
  validateClosedObject(frontPage, path, errors, ['type', 'page_slug', 'html']);
  if (!isObject(frontPage)) {
    return;
  }

  validateEnum(frontPage.type, `${path}.type`, 'INVALID_FRONT_PAGE_TYPE', errors, PREVIEW_FRONT_PAGE_TYPES);

  if (frontPage.type === 'page') {
    validateSlugSegment(frontPage.page_slug, `${path}.page_slug`, 'INVALID_FRONT_PAGE_PAGE_SLUG', errors);
  } else if (frontPage.page_slug !== undefined) {
    validateSlugSegment(frontPage.page_slug, `${path}.page_slug`, 'INVALID_FRONT_PAGE_PAGE_SLUG', errors);
  }

  if (frontPage.type === 'standalone_html') {
    validateNonEmptyString(frontPage.html, `${path}.html`, 'INVALID_FRONT_PAGE_HTML', errors);
  } else if (frontPage.html !== undefined) {
    validateString(frontPage.html, `${path}.html`, 'INVALID_FRONT_PAGE_HTML', errors);
  }
}

function validatePostIndex(postIndex, path, errors) {
  if (postIndex === undefined) {
    return;
  }
  validateClosedObject(postIndex, path, errors, ['enabled', 'path', 'paginate']);
  if (!isObject(postIndex)) {
    return;
  }

  if (postIndex.enabled !== undefined) {
    validateBoolean(postIndex.enabled, `${path}.enabled`, 'INVALID_POST_INDEX_ENABLED', errors);
  }
  validatePostIndexPath(postIndex.path, `${path}.path`, errors);
  if (postIndex.paginate !== undefined) {
    validateBoolean(postIndex.paginate, `${path}.paginate`, 'INVALID_POST_INDEX_PAGINATE', errors);
  }
}

function validatePostIndexPath(routePath, path, errors) {
  if (routePath === undefined) {
    return;
  }
  if (typeof routePath !== 'string' || routePath.trim() === '') {
    errors.push(issue('INVALID_POST_INDEX_PATH', path, 'Post index path must be a non-empty string'));
    return;
  }
  if (routePath.trim() !== routePath || !routePath.startsWith('/')) {
    errors.push(issue('INVALID_POST_INDEX_PATH', path, 'Post index path must be an absolute path starting with / and without surrounding whitespace'));
    return;
  }
  if (routePath.includes('\\') || routePath.includes('?') || routePath.includes('#') || routePath.includes('%') || /[\s\u0000-\u001F\u007F]/.test(routePath)) {
    errors.push(issue('INVALID_POST_INDEX_PATH', path, 'Post index path contains an unsafe character'));
    return;
  }
  if (routePath.endsWith('.html') || routePath.includes('.html/')) {
    errors.push(issue('INVALID_POST_INDEX_PATH', path, 'Post index path must not include a literal .html suffix'));
    return;
  }
  if (routePath === '/') {
    return;
  }

  const body = routePath.replace(/^\/+|\/+$/g, '');
  if (!body) {
    return;
  }

  const segments = body.split('/');
  if (segments.some((segment) => segment === '')) {
    errors.push(issue('INVALID_POST_INDEX_PATH', path, 'Post index path must not contain empty path segments'));
    return;
  }

  for (const segment of segments) {
    validatePathSegment(segment, path, 'INVALID_POST_INDEX_PATH', errors);
  }
}

function validatePermalinkPattern(pattern, path, fieldName, errors) {
  if (pattern === undefined) {
    return;
  }
  if (typeof pattern !== 'string' || pattern.trim() === '') {
    errors.push(issue('INVALID_PERMALINK_PATTERN', path, 'Permalink pattern must be a non-empty string'));
    return;
  }
  if (pattern.trim() !== pattern || !pattern.startsWith('/')) {
    errors.push(issue('INVALID_PERMALINK_PATTERN', path, 'Permalink pattern must be an absolute path starting with / and without surrounding whitespace'));
    return;
  }
  if (pattern.includes('\\') || pattern.includes('?') || pattern.includes('#') || pattern.includes('%') || /[\s\u0000-\u001F\u007F]/.test(pattern)) {
    errors.push(issue('INVALID_PERMALINK_PATTERN', path, 'Permalink pattern contains an unsafe character'));
    return;
  }
  if (pattern.endsWith('.html') || pattern.includes('.html/')) {
    errors.push(issue('INVALID_PERMALINK_PATTERN', path, 'Permalink pattern must not include a literal .html suffix'));
    return;
  }

  const body = pattern.replace(/^\/+|\/+$/g, '');
  if (!body) {
    errors.push(issue('INVALID_PERMALINK_PATTERN', path, 'Permalink pattern must contain path segments'));
    return;
  }

  const allowedTokens = PREVIEW_PERMALINK_TOKENS[fieldName] || new Set();
  const usedTokens = new Set();
  const segments = body.split('/');

  for (const segment of segments) {
    if (!segment) {
      errors.push(issue('INVALID_PERMALINK_PATTERN', path, 'Permalink pattern must not contain empty path segments'));
      return;
    }
    if (segment.includes(':')) {
      if (!segment.startsWith(':') || segment.slice(1).includes(':') || segment.length === 1) {
        errors.push(issue('INVALID_PERMALINK_TOKEN', path, 'Permalink tokens must occupy a full path segment'));
        return;
      }
      const token = segment.slice(1);
      if (!allowedTokens.has(token)) {
        errors.push(issue('INVALID_PERMALINK_TOKEN', path, `Unsupported permalink token :${token}`));
        return;
      }
      usedTokens.add(token);
      continue;
    }
    validatePathSegment(segment, path, 'INVALID_PERMALINK_PATTERN', errors);
  }

  if (fieldName === 'posts' && !usedTokens.has('slug') && !usedTokens.has('public_id')) {
    errors.push(issue('INVALID_PERMALINK_PATTERN', path, 'Post permalink pattern must include :slug or :public_id'));
  } else if (fieldName !== 'posts' && !usedTokens.has('slug')) {
    errors.push(issue('INVALID_PERMALINK_PATTERN', path, 'Permalink pattern must include :slug'));
  }
}

function validatePagePath(pagePath, path, errors) {
  if (pagePath === undefined) {
    return;
  }
  if (typeof pagePath !== 'string' || pagePath.trim() === '') {
    errors.push(issue('INVALID_PAGE_PATH', path, 'Page path must be a non-empty string'));
    return;
  }
  if (pagePath.trim() !== pagePath || pagePath.startsWith('/') || pagePath.endsWith('/')) {
    errors.push(issue('INVALID_PAGE_PATH', path, 'Page path must be relative and must not have leading or trailing slashes'));
    return;
  }
  if (pagePath.includes('\\') || pagePath.includes('?') || pagePath.includes('#') || pagePath.includes('%') || /[\s\u0000-\u001F\u007F]/.test(pagePath)) {
    errors.push(issue('INVALID_PAGE_PATH', path, 'Page path contains an unsafe character'));
    return;
  }
  if (pagePath.endsWith('.html') || pagePath.includes('.html/')) {
    errors.push(issue('INVALID_PAGE_PATH', path, 'Page path must not include a literal .html suffix'));
    return;
  }

  const segments = pagePath.split('/');
  if (segments.some((segment) => segment === '')) {
    errors.push(issue('INVALID_PAGE_PATH', path, 'Page path must not contain empty path segments'));
    return;
  }

  for (const segment of segments) {
    validatePathSegment(segment, path, 'INVALID_PAGE_PATH', errors);
  }
}

function validatePathSegment(segment, path, code, errors) {
  const beforeCount = errors.length;
  validateSlugSegment(segment, path, code, errors);
  if (errors.length > beforeCount) {
    errors[errors.length - 1].message = 'Path segments must follow the slug segment policy';
  }
}

function validatePreviewCategory(category, path, errors) {
  validateClosedObject(category, path, errors, ['name', 'slug', 'description']);
  if (!isObject(category)) {
    return;
  }

  validateNonEmptyString(category.name, `${path}.name`, 'INVALID_CATEGORY_NAME', errors);
  validateSlugSegment(category.slug, `${path}.slug`, 'INVALID_CATEGORY_SLUG', errors);
  if (category.description !== undefined) {
    validateString(category.description, `${path}.description`, 'INVALID_CATEGORY_DESCRIPTION', errors);
  }
}

function validatePreviewTag(tag, path, errors) {
  validateClosedObject(tag, path, errors, ['name', 'slug', 'description']);
  if (!isObject(tag)) {
    return;
  }

  validateNonEmptyString(tag.name, `${path}.name`, 'INVALID_TAG_NAME', errors);
  validateSlugSegment(tag.slug, `${path}.slug`, 'INVALID_TAG_SLUG', errors);
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
  if (path === '') {
    return key === '$schema' || key === 'menus' || key === 'widgets' || key === 'collections' || key === 'custom_css' || key === 'custom_html';
  }
  if (path === 'custom_html') {
    return key === 'head_end' || key === 'body_end';
  }
  if (path === 'site') {
    return key === 'media_delivery_mode' || key === 'favicon' || key === 'expose_generator' || key === 'indexing' || key === 'permalinks' || key === 'front_page' || key === 'post_index' || key === 'footer' || key === 'meta';
  }
  if (path === 'site.favicon') {
    return key === 'icon' || key === 'svg' || key === 'png' || key === 'apple_touch_icon';
  }
  if (path === 'site.footer') {
    return key === 'copyright_text' || key === 'attribution';
  }
  if (path === 'site.front_page') {
    return key === 'page_slug' || key === 'html';
  }
  if (path === 'site.post_index') {
    return key === 'enabled' || key === 'path' || key === 'paginate';
  }
  if (path === 'site.permalinks') {
    return key === 'output_style' || PREVIEW_PERMALINK_FIELDS.includes(key);
  }
  if (path === 'content') {
    return key === 'media';
  }
  if (path.startsWith('content.authors[')) {
    return key === 'avatar';
  }
  if (path.startsWith('content.media[')) {
    return key === 'alt';
  }
  if (path.startsWith('menus.') && (path.includes('.items[') || path.includes('.children['))) {
    return key === 'meta';
  }
  if (path.startsWith('widgets.') && path.includes('.items[')) {
    return key === 'settings';
  }
  if (path.startsWith('collections.') && !path.includes('.items[')) {
    return key === 'title' || key === 'description';
  }
  if (path.startsWith('content.posts[')) {
    return key === 'id' || key === 'featured_image' || key === 'meta' || key === 'data';
  }
  if (path.startsWith('content.pages[')) {
    return key === 'path' || key === 'excerpt' || key === 'featured_image' || key === 'meta' || key === 'data';
  }
  if (path.startsWith('content.categories[') || path.startsWith('content.tags[')) {
    return key === 'description';
  }
  return false;
}

function validateSlugArray(value, path, code, errors) {
  if (!Array.isArray(value)) {
    errors.push(issue(code, path, 'Expected an array'));
    return;
  }

  for (const [index, entry] of value.entries()) {
    validateSlugSegment(entry, `${path}[${index}]`, code, errors);
  }
}

function validateSlugSegment(value, path, code, errors) {
  const result = validateSharedSlugSegment(value);
  if (result.ok) {
    return;
  }

  const firstIssue = result.issues[0];
  const message = mapSlugValidationMessage(firstIssue?.code);
  errors.push(issue(code, path, message));
}

function mapSlugValidationMessage(issueCode) {
  switch (issueCode) {
    case SLUG_SEGMENT_ISSUE_CODES.INVALID_TYPE:
    case SLUG_SEGMENT_ISSUE_CODES.EMPTY:
      return 'Slug must be a non-empty string';
    case SLUG_SEGMENT_ISSUE_CODES.WHITESPACE:
      return 'Slug must not contain whitespace';
    case SLUG_SEGMENT_ISSUE_CODES.RESERVED_DOT_SEGMENT:
      return 'Slug must not be "." or ".."';
    case SLUG_SEGMENT_ISSUE_CODES.PATH_SEPARATOR:
      return 'Slug must be a single safe path segment';
    case SLUG_SEGMENT_ISSUE_CODES.PERCENT_ENCODING_OR_CONTROL:
      return 'Slug must not contain percent-encoding or control characters';
    default:
      return 'Slug must be a single safe path segment';
  }
}

function rejectLegacyKeys(value, path, errors, keys, code) {
  for (const key of keys) {
    if (key in value) {
      errors.push(issue(code, `${path}.${key}`, 'Legacy field is not allowed in preview-data v0.6'));
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
