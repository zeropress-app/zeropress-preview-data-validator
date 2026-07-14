import { SLUG_SEGMENT_ISSUE_CODES, validateSlugSegment as validateSharedSlugSegment } from '@zeropress/slug-policy';
import {
  ABSOLUTE_WEB_URL_PATTERN,
  COMMENTS_API_RELATIVE_URL_PATTERN,
  MEDIA_RELATIVE_URL_PATTERN,
  MEDIA_ORIGIN_PATTERN,
  NAVIGATION_RELATIVE_URL_PATTERN,
  OBJECT_CONTRACTS,
  PREVIEW_COLLECTION_ID_PATTERN,
  PREVIEW_COLLECTION_ITEM_TYPES,
  PREVIEW_COMMENTS_ORDERS,
  PREVIEW_COMMENTS_PROVIDERS,
  PREVIEW_COMMENT_REQUEST_TOKEN_MAX_LENGTH,
  PREVIEW_CUSTOM_HTML_SLOT_MAX_LENGTH,
  PREVIEW_DATA_KEY_PATTERN,
  PREVIEW_DATA_MAX_ARRAY_LENGTH,
  PREVIEW_DATA_MAX_DEPTH,
  PREVIEW_DATA_MAX_KEYS,
  PREVIEW_DATA_VERSION,
  PREVIEW_DATETIME_STYLES,
  PREVIEW_DISCOVERABILITY_VALUES,
  PREVIEW_DOCUMENT_TYPES,
  PREVIEW_FRONT_PAGE_TYPES,
  PREVIEW_MEDIA_DELIVERY_MODES,
  PREVIEW_MENU_ID_PATTERN,
  PREVIEW_MENU_TARGETS,
  PREVIEW_PERMALINK_FIELDS,
  PREVIEW_PERMALINK_OUTPUT_STYLES,
  PREVIEW_PERMALINK_TOKENS,
  PREVIEW_WIDGET_AREA_ID_PATTERN,
  RFC3339_PATTERN,
} from './contract-definitions.js';

export { PREVIEW_DATA_VERSION } from './contract-definitions.js';
export { canonicalizePreviewDataKeyOrder } from './canonicalize.js';

export function validatePreviewData(data) {
  const errors = [];

  validateClosedObject(data, '', errors, OBJECT_CONTRACTS.root);

  if (isObject(data)) {
    if (hasOwn(data, '$schema')) {
      validateString(data.$schema, '$schema', 'INVALID_SCHEMA_HINT', errors);
    }
    validateLiteral(data.version, PREVIEW_DATA_VERSION, 'version', 'INVALID_VERSION', errors);
    validateNonEmptyString(data.generator, 'generator', 'INVALID_GENERATOR', errors);
    validateDateTimeString(data.generated_at, 'generated_at', 'INVALID_GENERATED_AT', errors);

    validateSite(data.site, 'site', errors);
    validateContent(data.content, 'content', errors, data.site);
    if (hasOwn(data, 'menus')) {
      validateMenus(data.menus, 'menus', errors);
    }
    if (hasOwn(data, 'widgets')) {
      validateWidgets(data.widgets, 'widgets', errors);
    }
    if (hasOwn(data, 'collections')) {
      validateCollections(data.collections, 'collections', errors);
    }
    if (hasOwn(data, 'custom_css')) {
      validateCustomCss(data.custom_css, 'custom_css', errors);
    }
    if (hasOwn(data, 'custom_html')) {
      validateCustomHtml(data.custom_html, 'custom_html', errors);
    }
    validateContentIdentitiesAndReferences(data, errors);
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
  validateClosedObject(site, path, errors, OBJECT_CONTRACTS.site);
  if (!isObject(site)) {
    return;
  }

  validateNonEmptyString(site.title, `${path}.title`, 'INVALID_SITE_TITLE', errors);
  validateString(site.description, `${path}.description`, 'INVALID_SITE_DESCRIPTION', errors);
  validateSiteUri(site.url, `${path}.url`, 'INVALID_SITE_URL', errors);
  validateMediaOrigin(site.media_origin, `${path}.media_origin`, 'INVALID_SITE_MEDIA_ORIGIN', errors);
  if (hasOwn(site, 'media_delivery_mode')) {
    validateEnum(site.media_delivery_mode, `${path}.media_delivery_mode`, 'INVALID_SITE_MEDIA_DELIVERY_MODE', errors, PREVIEW_MEDIA_DELIVERY_MODES);
  }
  if (hasOwn(site, 'favicon')) {
    validateSiteFavicon(site.favicon, `${path}.favicon`, errors);
  }
  if (hasOwn(site, 'logo')) {
    validateSiteLogo(site.logo, `${path}.logo`, errors);
  }
  if (hasOwn(site, 'newsletter')) {
    validateSiteNewsletter(site.newsletter, `${path}.newsletter`, errors);
  }
  if (hasOwn(site, 'comments')) {
    validateSiteComments(site.comments, `${path}.comments`, errors);
  }
  if (hasOwn(site, 'expose_generator')) {
    validateBoolean(site.expose_generator, `${path}.expose_generator`, 'INVALID_SITE_EXPOSE_GENERATOR', errors);
  }
  if (hasOwn(site, 'search')) {
    validateSiteFeatureState(site.search, `${path}.search`, 'SEARCH', errors);
  }
  if (hasOwn(site, 'feed')) {
    validateSiteFeatureState(site.feed, `${path}.feed`, 'FEED', errors);
  }
  if (hasOwn(site, 'archive')) {
    validateSiteFeatureState(site.archive, `${path}.archive`, 'ARCHIVE', errors);
  }
  validateLocale(site.locale, `${path}.locale`, 'INVALID_SITE_LOCALE', errors);
  validateInteger(site.posts_per_page, `${path}.posts_per_page`, 'INVALID_SITE_POSTS_PER_PAGE', errors, { minimum: 1 });
  validateEnum(site.date_style, `${path}.date_style`, 'INVALID_SITE_DATE_STYLE', errors, PREVIEW_DATETIME_STYLES);
  validateEnum(site.time_style, `${path}.time_style`, 'INVALID_SITE_TIME_STYLE', errors, PREVIEW_DATETIME_STYLES);
  validateTimezone(site.timezone, `${path}.timezone`, 'INVALID_SITE_TIMEZONE', errors);
  if (hasOwn(site, 'robots')) {
    validateSiteRobots(site.robots, `${path}.robots`, errors);
  }
  validatePermalinks(ownValue(site, 'permalinks'), `${path}.permalinks`, errors);
  validateFrontPage(ownValue(site, 'front_page'), `${path}.front_page`, errors);
  validatePostIndex(ownValue(site, 'post_index'), `${path}.post_index`, errors);
  validatePreviewMeta(ownValue(site, 'meta'), `${path}.meta`, errors);
  if (hasOwn(site, 'footer')) {
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
    'indexing',
  ], 'INVALID_LEGACY_SITE_FIELD');

  if (site.media_delivery_mode === 'media_domain' && site.media_origin === '') {
    errors.push(issue(
      'INVALID_SITE_MEDIA_DELIVERY_CONFIGURATION',
      `${path}.media_origin`,
      'site.media_origin must be non-empty when media_delivery_mode is media_domain',
    ));
  }
}

function validateContent(content, path, errors, site) {
  validateClosedObject(content, path, errors, OBJECT_CONTRACTS.content);
  if (!isObject(content)) {
    return;
  }

  const authorIds = validateAuthorArray(content.authors, `${path}.authors`, errors);

  const commentPolicy = resolveContentCommentPolicy(site);
  validatePostArray(content.posts, `${path}.posts`, errors, authorIds, commentPolicy);
  validatePageArray(content.pages, `${path}.pages`, errors, commentPolicy);
  validateArray(content.categories, `${path}.categories`, 'INVALID_CATEGORIES', errors, (entry, index) => {
    validatePreviewCategory(entry, `${path}.categories[${index}]`, errors);
  });
  validateArray(content.tags, `${path}.tags`, 'INVALID_TAGS', errors, (entry, index) => {
    validatePreviewTag(entry, `${path}.tags[${index}]`, errors);
  });
  if (hasOwn(content, 'media')) {
    validateMediaArray(content.media, `${path}.media`, errors);
  }
}

function validateContentIdentitiesAndReferences(data, errors) {
  if (!isObject(data.site) || !isObject(data.content)) {
    return;
  }

  const postSlugs = new Set();
  if (Array.isArray(data.content.posts)) {
    for (const [index, post] of data.content.posts.entries()) {
      if (!isObject(post)) continue;
      const slug = normalizedSlugOrNull(post.slug);
      if (slug === null) continue;
      if (postSlugs.has(slug)) {
        errors.push(issue(
          'DUPLICATE_POST_SLUG',
          `content.posts[${index}].slug`,
          'Post slug values must be unique after NFC normalization',
        ));
      } else {
        postSlugs.add(slug);
      }
    }
  }

  const pagePaths = new Set();
  if (Array.isArray(data.content.pages)) {
    for (const [index, page] of data.content.pages.entries()) {
      if (!isObject(page)) continue;
      const effectivePath = resolveEffectivePagePath(data.site, page);
      if (effectivePath === null) continue;
      if (pagePaths.has(effectivePath)) {
        errors.push(issue(
          'DUPLICATE_PAGE_PATH',
          hasOwn(page, 'path') ? `content.pages[${index}].path` : `content.pages[${index}].slug`,
          'Effective Page paths must be unique after NFC normalization',
        ));
      } else {
        pagePaths.add(effectivePath);
      }
    }
  }

  const frontPage = data.site.front_page;
  if (isObject(frontPage) && frontPage.type === 'page' && typeof frontPage.page_path === 'string') {
    const pagePath = normalizePagePathOrNull(frontPage.page_path);
    if (pagePath !== null && !pagePaths.has(pagePath)) {
      errors.push(issue(
        'INVALID_FRONT_PAGE_PAGE_REFERENCE',
        'site.front_page.page_path',
        'Referenced effective Page path does not exist',
      ));
    }
  }

  if (!isObject(data.collections)) {
    return;
  }
  for (const [collectionId, collection] of Object.entries(data.collections)) {
    if (!isObject(collection) || !Array.isArray(collection.items)) continue;
    for (const [index, item] of collection.items.entries()) {
      if (!isObject(item)) continue;
      const itemPath = `collections.${collectionId}.items[${index}]`;
      if (item.type === 'post') {
        const slug = normalizedSlugOrNull(item.slug);
        if (slug !== null && !postSlugs.has(slug)) {
          errors.push(issue('INVALID_COLLECTION_ITEM_REFERENCE', `${itemPath}.slug`, 'Referenced Post slug does not exist'));
        }
      } else if (item.type === 'page') {
        const pagePath = normalizePagePathOrNull(item.path);
        if (pagePath !== null && !pagePaths.has(pagePath)) {
          errors.push(issue('INVALID_COLLECTION_ITEM_REFERENCE', `${itemPath}.path`, 'Referenced effective Page path does not exist'));
        }
      }
    }
  }
}

function resolveEffectivePagePath(site, page) {
  if (typeof page.path === 'string') {
    return normalizePagePathOrNull(page.path);
  }

  const slug = normalizedSlugOrNull(page.slug);
  if (slug === null) return null;
  const pagesPattern = isObject(site.permalinks) && typeof site.permalinks.pages === 'string'
    ? site.permalinks.pages
    : '/:slug/';
  if (!pagesPattern.includes(':slug')) return null;
  return normalizePagePathOrNull(pagesPattern.replaceAll(':slug', slug).replace(/^\/+|\/+$/gu, ''));
}

function normalizedSlugOrNull(value) {
  const result = validateSharedSlugSegment(value);
  return result.ok ? result.normalized : null;
}

function normalizePagePathOrNull(value) {
  if (typeof value !== 'string' || value === '') return null;
  const segments = value.split('/');
  if (segments.some((segment) => !validateSharedSlugSegment(segment).ok)) return null;
  return segments.map((segment) => segment.normalize('NFC')).join('/');
}

function validateSiteFooter(footer, path, errors) {
  validateClosedObject(footer, path, errors, OBJECT_CONTRACTS.siteFooter);
  if (!isObject(footer)) {
    return;
  }

  if (hasOwn(footer, 'copyright_text')) {
    validateNonEmptyString(footer.copyright_text, `${path}.copyright_text`, 'INVALID_SITE_FOOTER_COPYRIGHT_TEXT', errors);
  }

  if (hasOwn(footer, 'attribution')) {
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
  validateClosedObject(menu, path, errors, OBJECT_CONTRACTS.menu);
  if (!isObject(menu)) {
    return;
  }

  validateNonEmptyString(menu.name, `${path}.name`, 'INVALID_MENU_NAME', errors);
  validateArray(menu.items, `${path}.items`, 'INVALID_MENU_ITEMS', errors, (entry, index) => {
    validatePreviewMenuItem(entry, `${path}.items[${index}]`, errors);
  });
}

function validatePreviewMenuItem(item, path, errors) {
  validateClosedObject(item, path, errors, OBJECT_CONTRACTS.menuItem);
  if (!isObject(item)) {
    return;
  }

  validateNonEmptyString(item.title, `${path}.title`, 'INVALID_MENU_ITEM_TITLE', errors);
  validateNavigationUrl(item.url, `${path}.url`, 'INVALID_MENU_ITEM_URL', errors);
  validateEnum(item.target, `${path}.target`, 'INVALID_MENU_ITEM_TARGET', errors, PREVIEW_MENU_TARGETS);
  validatePreviewMeta(ownValue(item, 'meta'), `${path}.meta`, errors);
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
  validateClosedObject(collection, path, errors, OBJECT_CONTRACTS.collection);
  if (!isObject(collection)) {
    return;
  }

  if (hasOwn(collection, 'title')) {
    validateNonEmptyString(collection.title, `${path}.title`, 'INVALID_COLLECTION_TITLE', errors);
  }
  if (hasOwn(collection, 'description')) {
    validateString(collection.description, `${path}.description`, 'INVALID_COLLECTION_DESCRIPTION', errors);
  }

  const seenItems = new Set();
  validateArray(collection.items, `${path}.items`, 'INVALID_COLLECTION_ITEMS', errors, (entry, index) => {
    validatePreviewCollectionItem(entry, `${path}.items[${index}]`, errors, seenItems);
  });
}

function validatePreviewCollectionItem(item, path, errors, seenItems) {
  validateClosedObject(item, path, errors, OBJECT_CONTRACTS.collectionItem);
  if (!isObject(item)) {
    return;
  }

  validateEnum(item.type, `${path}.type`, 'INVALID_COLLECTION_ITEM_TYPE', errors, PREVIEW_COLLECTION_ITEM_TYPES);
  let normalizedIdentity = null;
  let identityPath = `${path}.type`;
  if (item.type === 'post') {
    normalizedIdentity = validateSlugSegment(item.slug, `${path}.slug`, 'INVALID_COLLECTION_ITEM_SLUG', errors);
    identityPath = `${path}.slug`;
    if (hasOwn(item, 'path')) {
      errors.push(issue('INVALID_COLLECTION_ITEM_SHAPE', `${path}.path`, 'Post collection items must not include path'));
    }
  } else if (item.type === 'page') {
    normalizedIdentity = validatePagePath(item.path, `${path}.path`, errors, 'INVALID_COLLECTION_ITEM_PATH');
    identityPath = `${path}.path`;
    if (hasOwn(item, 'slug')) {
      errors.push(issue('INVALID_COLLECTION_ITEM_SHAPE', `${path}.slug`, 'Page collection items must not include slug'));
    }
  }

  if (normalizedIdentity !== null && PREVIEW_COLLECTION_ITEM_TYPES.includes(item.type)) {
    const key = `${item.type}:${normalizedIdentity}`;
    if (seenItems.has(key)) {
      errors.push(issue('DUPLICATE_COLLECTION_ITEM', identityPath, 'Duplicate collection item in the same collection after NFC normalization'));
    }
    seenItems.add(key);
  }
}

function validatePreviewWidgetArea(widgetArea, path, errors) {
  validateClosedObject(widgetArea, path, errors, OBJECT_CONTRACTS.widgetArea);
  if (!isObject(widgetArea)) {
    return;
  }

  validateNonEmptyString(widgetArea.name, `${path}.name`, 'INVALID_WIDGET_AREA_NAME', errors);
  validateArray(widgetArea.items, `${path}.items`, 'INVALID_WIDGET_AREA_ITEMS', errors, (entry, index) => {
    validatePreviewWidgetItem(entry, `${path}.items[${index}]`, errors);
  });
}

function validatePreviewWidgetItem(item, path, errors) {
  validateClosedObject(item, path, errors, OBJECT_CONTRACTS.widgetItem);
  if (!isObject(item)) {
    return;
  }

  validateNonEmptyString(item.type, `${path}.type`, 'INVALID_WIDGET_ITEM_TYPE', errors);
  validateString(item.title, `${path}.title`, 'INVALID_WIDGET_ITEM_TITLE', errors);

  if (hasOwn(item, 'settings')) {
    validateObject(item.settings, `${path}.settings`, 'INVALID_WIDGET_ITEM_SETTINGS', errors);
  }
}

function validateCustomCss(customCss, path, errors) {
  validateClosedObject(customCss, path, errors, OBJECT_CONTRACTS.customCss);
  if (!isObject(customCss)) {
    return;
  }

  validateNonEmptyString(customCss.content, `${path}.content`, 'INVALID_CUSTOM_CSS_CONTENT', errors);
}

function validateCustomHtml(customHtml, path, errors) {
  validateClosedObject(customHtml, path, errors, OBJECT_CONTRACTS.customHtml);
  if (!isObject(customHtml)) {
    return;
  }

  if (!hasOwn(customHtml, 'head_end') && !hasOwn(customHtml, 'body_end')) {
    errors.push(issue('INVALID_CUSTOM_HTML', path, 'custom_html must include head_end or body_end'));
  }

  if (hasOwn(customHtml, 'head_end')) {
    validateCustomHtmlSlot(customHtml.head_end, `${path}.head_end`, errors);
  }
  if (hasOwn(customHtml, 'body_end')) {
    validateCustomHtmlSlot(customHtml.body_end, `${path}.body_end`, errors);
  }
}

function validateCustomHtmlSlot(slot, path, errors) {
  if (typeof slot !== 'string' || slot.trim() === '') {
    errors.push(issue('INVALID_CUSTOM_HTML_SLOT', path, 'Expected a non-blank string'));
    return;
  }

  if ([...slot].length > PREVIEW_CUSTOM_HTML_SLOT_MAX_LENGTH) {
    errors.push(issue(
      'INVALID_CUSTOM_HTML_SLOT',
      path,
      `Custom HTML slot must not exceed ${PREVIEW_CUSTOM_HTML_SLOT_MAX_LENGTH} Unicode code points`,
    ));
  }
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

function validatePostArray(value, path, errors, authorIds, commentPolicy) {
  const publicIds = new Set();

  validateArray(value, path, 'INVALID_POSTS', errors, (entry, index) => {
    validatePreviewPost(entry, `${path}[${index}]`, errors, authorIds, commentPolicy);

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

function validatePageArray(value, path, errors, commentPolicy) {
  const publicIds = new Set();

  validateArray(value, path, 'INVALID_PAGES', errors, (entry, index) => {
    validatePreviewPage(entry, `${path}[${index}]`, errors, commentPolicy);

    if (!isObject(entry) || !Number.isInteger(entry.public_id) || entry.public_id <= 0) {
      return;
    }

    if (publicIds.has(entry.public_id)) {
      errors.push(issue('DUPLICATE_PAGE_PUBLIC_ID', `${path}[${index}].public_id`, 'Page public_id values must be unique'));
      return;
    }

    publicIds.add(entry.public_id);
  });
}

function validatePreviewAuthor(author, path, errors) {
  validateClosedObject(author, path, errors, OBJECT_CONTRACTS.author);
  if (!isObject(author)) {
    return;
  }

  validateNonEmptyString(author.id, `${path}.id`, 'INVALID_AUTHOR_ID', errors);
  validateNonEmptyString(author.display_name, `${path}.display_name`, 'INVALID_AUTHOR_DISPLAY_NAME', errors);

  if (hasOwn(author, 'avatar')) {
    validateMediaUrl(author.avatar, `${path}.avatar`, 'INVALID_AUTHOR_AVATAR', errors);
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
  validateClosedObject(favicon, path, errors, OBJECT_CONTRACTS.siteFavicon);
  if (!isObject(favicon)) {
    return;
  }

  if (
    !hasOwn(favicon, 'icon') &&
    !hasOwn(favicon, 'icon_dark') &&
    !hasOwn(favicon, 'svg') &&
    !hasOwn(favicon, 'png') &&
    !hasOwn(favicon, 'apple_touch_icon')
  ) {
    errors.push(issue('INVALID_SITE_FAVICON', path, 'site.favicon must include at least one favicon URL'));
  }

  for (const key of ['icon', 'icon_dark', 'svg', 'png', 'apple_touch_icon']) {
    if (hasOwn(favicon, key)) {
      validateMediaUrl(favicon[key], `${path}.${key}`, 'INVALID_SITE_FAVICON_URL', errors);
    }
  }
}

function validateSiteLogo(logo, path, errors) {
  validateClosedObject(logo, path, errors, OBJECT_CONTRACTS.siteLogo);
  if (!isObject(logo)) {
    return;
  }

  validateMediaUrl(logo.src, `${path}.src`, 'INVALID_SITE_LOGO_URL', errors);
  if (hasOwn(logo, 'alt')) {
    validateString(logo.alt, `${path}.alt`, 'INVALID_SITE_LOGO_ALT', errors);
  }
}

function validateSiteNewsletter(newsletter, path, errors) {
  validateClosedObject(newsletter, path, errors, OBJECT_CONTRACTS.siteNewsletter);
  if (!isObject(newsletter)) {
    return;
  }

  validateBoolean(newsletter.enabled, `${path}.enabled`, 'INVALID_SITE_NEWSLETTER_ENABLED', errors);

  if (hasOwn(newsletter, 'title')) {
    validateString(newsletter.title, `${path}.title`, 'INVALID_SITE_NEWSLETTER_TITLE', errors);
  }
  if (hasOwn(newsletter, 'description')) {
    validateString(newsletter.description, `${path}.description`, 'INVALID_SITE_NEWSLETTER_DESCRIPTION', errors);
  }
  if (hasOwn(newsletter, 'button_label')) {
    validateString(newsletter.button_label, `${path}.button_label`, 'INVALID_SITE_NEWSLETTER_BUTTON_LABEL', errors);
  }
  if (hasOwn(newsletter, 'signup_url')) {
    validateNewsletterUrl(newsletter.signup_url, `${path}.signup_url`, 'INVALID_SITE_NEWSLETTER_SIGNUP_URL', errors);
  }
  if (hasOwn(newsletter, 'embed_url')) {
    validateNewsletterUrl(newsletter.embed_url, `${path}.embed_url`, 'INVALID_SITE_NEWSLETTER_EMBED_URL', errors);
  }

  if (newsletter.enabled === true && !hasOwn(newsletter, 'signup_url') && !hasOwn(newsletter, 'embed_url')) {
    errors.push(issue('INVALID_SITE_NEWSLETTER_URL', path, 'site.newsletter requires signup_url or embed_url when enabled is true'));
  }
}

function validateSiteComments(comments, path, errors) {
  validateClosedObject(comments, path, errors, OBJECT_CONTRACTS.siteComments);
  if (!isObject(comments)) {
    return;
  }

  validateBoolean(comments.enabled, `${path}.enabled`, 'INVALID_SITE_COMMENTS_ENABLED', errors);
  validateCommentsApiBaseUrl(comments.api_base_url, `${path}.api_base_url`, 'INVALID_SITE_COMMENTS_API_BASE_URL', errors);
  if (hasOwn(comments, 'provider')) {
    validateEnum(comments.provider, `${path}.provider`, 'INVALID_SITE_COMMENTS_PROVIDER', errors, PREVIEW_COMMENTS_PROVIDERS);
  }
  if (hasOwn(comments, 'per_page')) {
    validateInteger(comments.per_page, `${path}.per_page`, 'INVALID_SITE_COMMENTS_PER_PAGE', errors, { minimum: 1, maximum: 100 });
  }
  if (hasOwn(comments, 'order')) {
    validateEnum(comments.order, `${path}.order`, 'INVALID_SITE_COMMENTS_ORDER', errors, PREVIEW_COMMENTS_ORDERS);
  }
  if (hasOwn(comments, 'threading')) {
    validateSiteCommentsThreading(comments.threading, `${path}.threading`, errors);
  }
}

function validateSiteFeatureState(state, path, featureName, errors) {
  validateClosedObject(state, path, errors, OBJECT_CONTRACTS.siteFeatureState);
  if (!isObject(state)) {
    return;
  }

  validateBoolean(state.enabled, `${path}.enabled`, `INVALID_SITE_${featureName}_ENABLED`, errors);
}

function validateSiteRobots(robots, path, errors) {
  validateClosedObject(robots, path, errors, OBJECT_CONTRACTS.siteRobots);
  if (!isObject(robots)) {
    return;
  }

  validateBoolean(robots.allow_indexing, `${path}.allow_indexing`, 'INVALID_SITE_ROBOTS_ALLOW_INDEXING', errors);
}

function validateSiteCommentsThreading(threading, path, errors) {
  validateClosedObject(threading, path, errors, OBJECT_CONTRACTS.siteCommentsThreading);
  if (!isObject(threading)) {
    return;
  }

  if (hasOwn(threading, 'enabled')) {
    validateBoolean(threading.enabled, `${path}.enabled`, 'INVALID_SITE_COMMENTS_THREADING_ENABLED', errors);
  }
  if (hasOwn(threading, 'max_depth')) {
    validateInteger(threading.max_depth, `${path}.max_depth`, 'INVALID_SITE_COMMENTS_THREADING_MAX_DEPTH', errors, { minimum: 2, maximum: 10 });
  }
}

function validatePreviewMedia(media, path, errors) {
  validateClosedObject(media, path, errors, OBJECT_CONTRACTS.media);
  if (!isObject(media)) {
    return;
  }

  validateMediaUrl(media.src, `${path}.src`, 'INVALID_MEDIA_SRC', errors);
  validateInteger(media.width, `${path}.width`, 'INVALID_MEDIA_WIDTH', errors, { minimum: 1 });
  validateInteger(media.height, `${path}.height`, 'INVALID_MEDIA_HEIGHT', errors, { minimum: 1 });
  if (hasOwn(media, 'alt')) {
    validateString(media.alt, `${path}.alt`, 'INVALID_MEDIA_ALT', errors);
  }
}

function validatePreviewPost(post, path, errors, authorIds, commentPolicy) {
  validateClosedObject(post, path, errors, OBJECT_CONTRACTS.post);
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
  if (hasOwn(post, 'discoverability')) {
    validateEnum(post.discoverability, `${path}.discoverability`, 'INVALID_POST_DISCOVERABILITY', errors, PREVIEW_DISCOVERABILITY_VALUES);
  }
  validateBoolean(post.allow_comments, `${path}.allow_comments`, 'INVALID_POST_ALLOW_COMMENTS', errors);
  validateContentCommentsPolicy(post, path, errors, commentPolicy, 'post');
  validateSlugArray(post.category_slugs, `${path}.category_slugs`, 'INVALID_POST_CATEGORY_SLUGS', errors);
  validateSlugArray(post.tag_slugs, `${path}.tag_slugs`, 'INVALID_POST_TAG_SLUGS', errors, {
    duplicateCode: 'DUPLICATE_POST_TAG_SLUG',
  });

  if (hasOwn(post, 'featured_image')) {
    validateMediaUrl(post.featured_image, `${path}.featured_image`, 'INVALID_POST_FEATURED_IMAGE', errors);
  }
  validatePreviewMeta(ownValue(post, 'meta'), `${path}.meta`, errors);
  validatePreviewStructuredData(ownValue(post, 'data'), `${path}.data`, errors);

  if (typeof post.author_id === 'string' && post.author_id.trim() !== '' && !authorIds.has(post.author_id)) {
    errors.push(issue('INVALID_POST_AUTHOR_REFERENCE', `${path}.author_id`, 'Referenced author_id does not exist'));
  }
}

function validatePreviewPage(page, path, errors, commentPolicy) {
  validateClosedObject(page, path, errors, OBJECT_CONTRACTS.page);
  if (!isObject(page)) {
    return;
  }

  if (hasOwn(page, 'public_id')) {
    validateInteger(page.public_id, `${path}.public_id`, 'INVALID_PAGE_PUBLIC_ID', errors, { minimum: 1 });
  }
  validateNonEmptyString(page.title, `${path}.title`, 'INVALID_PAGE_TITLE', errors);
  validateSlugSegment(page.slug, `${path}.slug`, 'INVALID_PAGE_SLUG', errors);
  if (hasOwn(page, 'path')) {
    validatePagePath(page.path, `${path}.path`, errors);
  }
  validateString(page.content, `${path}.content`, 'INVALID_PAGE_CONTENT', errors);
  validateEnum(page.document_type, `${path}.document_type`, 'INVALID_PAGE_DOCUMENT_TYPE', errors, PREVIEW_DOCUMENT_TYPES);
  if (hasOwn(page, 'excerpt')) {
    validateString(page.excerpt, `${path}.excerpt`, 'INVALID_PAGE_EXCERPT', errors);
  }
  if (hasOwn(page, 'featured_image')) {
    validateMediaUrl(page.featured_image, `${path}.featured_image`, 'INVALID_PAGE_FEATURED_IMAGE', errors);
  }
  if (hasOwn(page, 'updated_at_iso')) {
    validateDateTimeString(page.updated_at_iso, `${path}.updated_at_iso`, 'INVALID_PAGE_UPDATED_AT_ISO', errors);
  }
  validatePreviewMeta(ownValue(page, 'meta'), `${path}.meta`, errors);
  validatePreviewStructuredData(ownValue(page, 'data'), `${path}.data`, errors);
  validateEnum(page.status, `${path}.status`, 'INVALID_PAGE_STATUS', errors, ['published', 'draft']);
  if (hasOwn(page, 'discoverability')) {
    validateEnum(page.discoverability, `${path}.discoverability`, 'INVALID_PAGE_DISCOVERABILITY', errors, PREVIEW_DISCOVERABILITY_VALUES);
  }
  if (hasOwn(page, 'allow_comments')) {
    validateBoolean(page.allow_comments, `${path}.allow_comments`, 'INVALID_PAGE_ALLOW_COMMENTS', errors);
  }
  if (page.allow_comments === true && !hasOwn(page, 'public_id')) {
    errors.push(issue('MISSING_REQUIRED_PROPERTY', `${path}.public_id`, 'Page public_id is required when allow_comments is true'));
  }
  validateContentCommentsPolicy(page, path, errors, commentPolicy, 'page');
}

function resolveContentCommentPolicy(site) {
  if (!isObject(site) || !isObject(site.comments) || site.comments.enabled !== true) {
    return { zeroPressEnabled: false };
  }

  const provider = hasOwn(site.comments, 'provider') ? site.comments.provider : 'zeropress';
  return { zeroPressEnabled: provider === 'zeropress' };
}

function validateContentCommentsPolicy(item, path, errors, commentPolicy, contentType) {
  const hasComments = hasOwn(item, 'comments');
  const requiresComments = commentPolicy.zeroPressEnabled && item.allow_comments === true;
  const label = contentType === 'page' ? 'Page' : 'Post';

  if (requiresComments && !hasComments) {
    errors.push(issue(
      'MISSING_REQUIRED_PROPERTY',
      `${path}.comments`,
      `${label} comments metadata is required when ZeroPress comments are enabled`,
    ));
  }

  if (hasComments) {
    validateContentComments(item.comments, `${path}.comments`, errors);
  }
}

function validateContentComments(comments, path, errors) {
  validateClosedObject(comments, path, errors, OBJECT_CONTRACTS.contentComments);
  if (!isObject(comments)) {
    return;
  }

  validateNonEmptyString(comments.request_token, `${path}.request_token`, 'INVALID_COMMENT_REQUEST_TOKEN', errors);
  if (
    typeof comments.request_token === 'string' &&
    [...comments.request_token].length > PREVIEW_COMMENT_REQUEST_TOKEN_MAX_LENGTH
  ) {
    errors.push(issue(
      'INVALID_COMMENT_REQUEST_TOKEN',
      `${path}.request_token`,
      `Comment request token must not exceed ${PREVIEW_COMMENT_REQUEST_TOKEN_MAX_LENGTH} Unicode code points`,
    ));
  }
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

  for (let index = 0; index < array.length; index += 1) {
    const value = array[index];
    validatePreviewDataValue(value, `${path}[${index}]`, errors, depth + 1);
  }
}

function validatePermalinks(permalinks, path, errors) {
  if (permalinks === undefined) {
    return;
  }
  validateClosedObject(permalinks, path, errors, OBJECT_CONTRACTS.permalinks);
  if (!isObject(permalinks)) {
    return;
  }

  if (hasOwn(permalinks, 'output_style')) {
    validateEnum(permalinks.output_style, `${path}.output_style`, 'INVALID_PERMALINK_OUTPUT_STYLE', errors, PREVIEW_PERMALINK_OUTPUT_STYLES);
  }

  for (const fieldName of PREVIEW_PERMALINK_FIELDS) {
    validatePermalinkPattern(ownValue(permalinks, fieldName), `${path}.${fieldName}`, fieldName, errors);
  }
}

function validateFrontPage(frontPage, path, errors) {
  if (frontPage === undefined) {
    return;
  }
  validateClosedObject(frontPage, path, errors, OBJECT_CONTRACTS.frontPage);
  if (!isObject(frontPage)) {
    return;
  }

  validateEnum(frontPage.type, `${path}.type`, 'INVALID_FRONT_PAGE_TYPE', errors, PREVIEW_FRONT_PAGE_TYPES);

  if (frontPage.type === 'page') {
    validatePagePath(frontPage.page_path, `${path}.page_path`, errors, 'INVALID_FRONT_PAGE_PAGE_PATH');
    if (hasOwn(frontPage, 'html')) {
      errors.push(issue('INVALID_FRONT_PAGE_SHAPE', `${path}.html`, 'Page front_page must not include html'));
    }
  } else if (frontPage.type === 'standalone_html') {
    validateNonEmptyString(frontPage.html, `${path}.html`, 'INVALID_FRONT_PAGE_HTML', errors);
    if (hasOwn(frontPage, 'page_path')) {
      errors.push(issue('INVALID_FRONT_PAGE_SHAPE', `${path}.page_path`, 'standalone_html front_page must not include page_path'));
    }
  } else if (frontPage.type === 'theme_index') {
    if (hasOwn(frontPage, 'page_path')) {
      errors.push(issue('INVALID_FRONT_PAGE_SHAPE', `${path}.page_path`, 'theme_index front_page must not include page_path'));
    }
    if (hasOwn(frontPage, 'html')) {
      errors.push(issue('INVALID_FRONT_PAGE_SHAPE', `${path}.html`, 'theme_index front_page must not include html'));
    }
  }
}

function validatePostIndex(postIndex, path, errors) {
  if (postIndex === undefined) {
    return;
  }
  validateClosedObject(postIndex, path, errors, OBJECT_CONTRACTS.postIndex);
  if (!isObject(postIndex)) {
    return;
  }

  if (hasOwn(postIndex, 'enabled')) {
    validateBoolean(postIndex.enabled, `${path}.enabled`, 'INVALID_POST_INDEX_ENABLED', errors);
  }
  validatePostIndexPath(ownValue(postIndex, 'path'), `${path}.path`, errors);
  if (hasOwn(postIndex, 'paginate')) {
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
  if (routePath.includes('//')) {
    errors.push(issue('INVALID_POST_INDEX_PATH', path, 'Post index path must not contain empty path segments'));
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
  if (pattern.includes('//')) {
    errors.push(issue('INVALID_PERMALINK_PATTERN', path, 'Permalink pattern must not contain empty path segments'));
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

function validatePagePath(pagePath, path, errors, code = 'INVALID_PAGE_PATH') {
  if (pagePath === undefined) {
    errors.push(issue(code, path, 'Page path must be a non-empty string'));
    return null;
  }
  if (typeof pagePath !== 'string' || pagePath.trim() === '') {
    errors.push(issue(code, path, 'Page path must be a non-empty string'));
    return null;
  }
  if (pagePath.trim() !== pagePath || pagePath.startsWith('/') || pagePath.endsWith('/')) {
    errors.push(issue(code, path, 'Page path must be relative and must not have leading or trailing slashes'));
    return null;
  }
  if (pagePath.includes('\\') || pagePath.includes('?') || pagePath.includes('#') || pagePath.includes('%') || /[\s\u0000-\u001F\u007F]/.test(pagePath)) {
    errors.push(issue(code, path, 'Page path contains an unsafe character'));
    return null;
  }
  if (pagePath.endsWith('.html') || pagePath.includes('.html/')) {
    errors.push(issue(code, path, 'Page path must not include a literal .html suffix'));
    return null;
  }

  const segments = pagePath.split('/');
  if (segments.some((segment) => segment === '')) {
    errors.push(issue(code, path, 'Page path must not contain empty path segments'));
    return null;
  }

  let valid = true;
  for (const segment of segments) {
    const beforeCount = errors.length;
    validatePathSegment(segment, path, code, errors);
    valid = valid && errors.length === beforeCount;
  }
  return valid ? segments.map((segment) => segment.normalize('NFC')).join('/') : null;
}

function validatePathSegment(segment, path, code, errors) {
  const beforeCount = errors.length;
  validateSlugSegment(segment, path, code, errors);
  if (errors.length > beforeCount) {
    errors[errors.length - 1].message = 'Path segments must follow the slug segment policy';
  }
}

function validatePreviewCategory(category, path, errors) {
  validateClosedObject(category, path, errors, OBJECT_CONTRACTS.category);
  if (!isObject(category)) {
    return;
  }

  validateNonEmptyString(category.name, `${path}.name`, 'INVALID_CATEGORY_NAME', errors);
  validateSlugSegment(category.slug, `${path}.slug`, 'INVALID_CATEGORY_SLUG', errors);
  if (hasOwn(category, 'description')) {
    validateString(category.description, `${path}.description`, 'INVALID_CATEGORY_DESCRIPTION', errors);
  }
}

function validatePreviewTag(tag, path, errors) {
  validateClosedObject(tag, path, errors, OBJECT_CONTRACTS.tag);
  if (!isObject(tag)) {
    return;
  }

  validateNonEmptyString(tag.name, `${path}.name`, 'INVALID_TAG_NAME', errors);
  validateSlugSegment(tag.slug, `${path}.slug`, 'INVALID_TAG_SLUG', errors);
  if (hasOwn(tag, 'description')) {
    validateString(tag.description, `${path}.description`, 'INVALID_TAG_DESCRIPTION', errors);
  }
}

function validateArray(value, path, code, errors, itemValidator) {
  if (!Array.isArray(value)) {
    errors.push(issue(code, path, 'Expected an array'));
    return;
  }

  for (let index = 0; index < value.length; index += 1) {
    itemValidator(value[index], index);
  }
}

function validateClosedObject(value, path, errors, definition) {
  validateObject(value, path, 'INVALID_OBJECT', errors);
  if (!isObject(value)) {
    return;
  }

  for (const key of Object.keys(value)) {
    if (!definition.allowed.includes(key)) {
      errors.push(issue('UNKNOWN_PROPERTY', path ? `${path}.${key}` : key, 'Unexpected property'));
    }
  }

  for (const key of definition.required) {
    if (!Object.hasOwn(value, key)) {
      errors.push(issue('MISSING_REQUIRED_PROPERTY', path ? `${path}.${key}` : key, 'Missing required property'));
    }
  }
}

function validateSlugArray(value, path, code, errors, { duplicateCode } = {}) {
  if (!Array.isArray(value)) {
    errors.push(issue(code, path, 'Expected an array'));
    return;
  }

  const seen = duplicateCode ? new Set() : null;
  for (const [index, entry] of value.entries()) {
    const normalized = validateSlugSegment(entry, `${path}[${index}]`, code, errors);
    if (seen && normalized !== null) {
      if (seen.has(normalized)) {
        errors.push(issue(
          duplicateCode,
          `${path}[${index}]`,
          'Post tag_slugs values must be unique after NFC normalization',
        ));
      } else {
        seen.add(normalized);
      }
    }
  }
}

function validateSlugSegment(value, path, code, errors) {
  const result = validateSharedSlugSegment(value);
  if (result.ok) {
    return result.normalized;
  }

  const firstIssue = result.issues[0];
  const message = mapSlugValidationMessage(firstIssue?.code);
  errors.push(issue(code, path, message));
  return null;
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
    case SLUG_SEGMENT_ISSUE_CODES.INVALID_DOT_PLACEMENT:
      return 'Slug periods must be isolated and may not appear at the beginning or end';
    case SLUG_SEGMENT_ISSUE_CODES.PATH_SEPARATOR:
      return 'Slug must be a single safe path segment';
    case SLUG_SEGMENT_ISSUE_CODES.PERCENT_ENCODING_OR_CONTROL:
      return 'Slug must not contain percent-encoding or control characters';
    case SLUG_SEGMENT_ISSUE_CODES.DISALLOWED_CHARACTER:
      return 'Slug may contain only Unicode letters, combining marks, decimal digits, period, hyphen, and underscore';
    case SLUG_SEGMENT_ISSUE_CODES.TOO_LONG:
      return 'Slug must not exceed 200 Unicode code points';
    default:
      return 'Slug must be a single safe path segment';
  }
}

function rejectLegacyKeys(value, path, errors, keys, code) {
  for (const key of keys) {
    if (hasOwn(value, key)) {
      errors.push(issue(code, `${path}.${key}`, 'Legacy field is not allowed in preview-data v0.7'));
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

function validateLocale(value, path, code, errors) {
  if (typeof value !== 'string' || value.trim() === '' || value.trim() !== value) {
    errors.push(issue(code, path, 'Expected a canonical BCP 47 locale string'));
    return;
  }

  try {
    const canonical = Intl.getCanonicalLocales(value);
    if (canonical.length !== 1 || canonical[0] !== value) {
      errors.push(issue(code, path, 'Expected a canonical BCP 47 locale string'));
    }
  } catch {
    errors.push(issue(code, path, 'Expected a canonical BCP 47 locale string'));
  }
}

function validateTimezone(value, path, code, errors) {
  if (value === 'UTC') {
    return;
  }
  if (typeof value !== 'string' || value.trim() === '' || value.trim() !== value) {
    errors.push(issue(code, path, 'Expected UTC, a canonical IANA time zone, or a fixed offset from -14:00 through +14:00'));
    return;
  }

  const offset = /^([+-])(\d{2}):(\d{2})$/u.exec(value);
  if (offset) {
    const hours = Number(offset[2]);
    const minutes = Number(offset[3]);
    if (hours > 14 || minutes > 59 || (hours === 14 && minutes !== 0) || (hours === 0 && minutes === 0)) {
      errors.push(issue(code, path, 'Expected UTC, a canonical IANA time zone, or a fixed offset from -14:00 through +14:00'));
    }
    return;
  }

  try {
    const canonical = new Intl.DateTimeFormat('en-US', { timeZone: value }).resolvedOptions().timeZone;
    if (canonical === value) return;
  } catch {
    // Fall through to the shared validation issue.
  }

  errors.push(issue(code, path, 'Expected UTC, a canonical IANA time zone, or a fixed offset from -14:00 through +14:00'));
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
  if (options.maximum !== undefined && value > options.maximum) {
    errors.push(issue(code, path, `Expected integer <= ${options.maximum}`));
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
  if (typeof value !== 'string' || value.trim() === '' || value.trim() !== value) {
    errors.push(issue(code, path, 'Expected a date-time string'));
    return;
  }

  const match = RFC3339_PATTERN.exec(value);
  if (!match) {
    errors.push(issue(code, path, 'Expected a valid RFC 3339 date-time string'));
    return;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  const offsetHour = match[10] === undefined ? 0 : Number(match[10]);
  const offsetMinute = match[11] === undefined ? 0 : Number(match[11]);

  if (
    month < 1 || month > 12 ||
    day < 1 || day > daysInMonth(year, month) ||
    hour > 23 || minute > 59 || second > 60 ||
    offsetHour > 23 || offsetMinute > 59
  ) {
    errors.push(issue(code, path, 'Expected a valid RFC 3339 date-time string'));
  }
}

function daysInMonth(year, month) {
  if (month === 2) {
    const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    return leapYear ? 29 : 28;
  }
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

function validateSiteUri(value, path, code, errors) {
  if (value === '') {
    return;
  }

  if (!isMediaOrigin(value)) {
    errors.push(issue(code, path, 'Expected an empty string or an HTTP(S) origin without credentials, path, query, or fragment'));
  }
}

function validateMediaOrigin(value, path, code, errors) {
  if (value === '') {
    return;
  }

  if (!isMediaOrigin(value)) {
    errors.push(issue(code, path, 'Expected an empty string or an absolute HTTP(S) origin with an optional port and without credentials, path, query, or fragment'));
  }
}

function validateNavigationUrl(value, path, code, errors) {
  if (!isNavigationUrl(value)) {
    errors.push(issue(code, path, 'Expected a credential-free HTTP(S) URL or a safe single-slash root-relative URL'));
  }
}

function validateMediaUrl(value, path, code, errors) {
  if (!isMediaUrl(value)) {
    errors.push(issue(code, path, 'Expected a credential-free HTTP(S) URL or a safe single-slash root-relative media URL with a path'));
  }
}

function validateNewsletterUrl(value, path, code, errors) {
  if (!isNavigationUrl(value)) {
    errors.push(issue(code, path, 'Expected a credential-free HTTP(S) URL or a safe single-slash root-relative URL'));
  }
}

function validateCommentsApiBaseUrl(value, path, code, errors) {
  if (!isCommentsApiBaseUrl(value)) {
    errors.push(issue(code, path, 'Expected an absolute http(s) URL or root-relative path without credentials, query, or fragment'));
  }
}

function isAbsoluteWebUrl(value) {
  if (!isSafeUrlString(value) || !ABSOLUTE_WEB_URL_PATTERN.test(value)) {
    return false;
  }

  let url;
  try {
    url = new URL(value);
  } catch {
    return false;
  }

  return (
    (url.protocol === 'http:' || url.protocol === 'https:') &&
    url.hostname !== '' &&
    url.username === '' &&
    url.password === '' &&
    !hasDotPathSegment(value)
  );
}

function isMediaOrigin(value) {
  if (!isSafeUrlString(value) || !MEDIA_ORIGIN_PATTERN.test(value)) {
    return false;
  }

  let url;
  try {
    url = new URL(value);
  } catch {
    return false;
  }

  return (
    (url.protocol === 'http:' || url.protocol === 'https:') &&
    url.hostname !== '' &&
    url.username === '' &&
    url.password === '' &&
    url.pathname === '/' &&
    url.search === '' &&
    url.hash === ''
  );
}

function isNavigationUrl(value) {
  if (!isSafeUrlString(value) || value.startsWith('//')) {
    return false;
  }
  if (/^[A-Za-z][A-Za-z0-9+.-]*:/u.test(value)) {
    return isAbsoluteWebUrl(value);
  }
  if (!NAVIGATION_RELATIVE_URL_PATTERN.test(value) || hasDotPathSegment(value)) {
    return false;
  }

  return true;
}

function isMediaUrl(value) {
  if (!isSafeUrlString(value) || value.startsWith('//')) {
    return false;
  }
  if (/^[A-Za-z][A-Za-z0-9+.-]*:/u.test(value)) {
    return isAbsoluteWebUrl(value) && new URL(value).pathname !== '/';
  }
  if (!MEDIA_RELATIVE_URL_PATTERN.test(value) || hasDotPathSegment(value)) {
    return false;
  }
  const pathComponent = value.split(/[?#]/u, 1)[0];
  return pathComponent.length > 1;
}

function isCommentsApiBaseUrl(value) {
  if (typeof value !== 'string' || value === '') {
    return false;
  }

  if (value.startsWith('/')) {
    return COMMENTS_API_RELATIVE_URL_PATTERN.test(value) && !hasDotPathSegment(value);
  }

  if (!isAbsoluteWebUrl(value) || value.includes('?') || value.includes('#')) {
    return false;
  }

  try {
    const parsed = new URL(value);
    return parsed.username === '' && parsed.password === '';
  } catch {
    return false;
  }
}

function isSafeUrlString(value) {
  return (
    typeof value === 'string' &&
    value !== '' &&
    value.trim() === value &&
    !/[\s\\\p{Cc}]/u.test(value) &&
    !/%(?![0-9A-Fa-f]{2})/u.test(value)
  );
}

function hasDotPathSegment(value) {
  let rawPath;
  if (/^[A-Za-z][A-Za-z0-9+.-]*:/u.test(value)) {
    const authorityStart = value.indexOf('://') + 3;
    const suffix = value.slice(authorityStart);
    const delimiterIndex = suffix.search(/[/?#]/u);
    rawPath = delimiterIndex === -1 || suffix[delimiterIndex] !== '/'
      ? '/'
      : suffix.slice(delimiterIndex).split(/[?#]/u, 1)[0];
  } else {
    rawPath = value.split(/[?#]/u, 1)[0];
  }

  return rawPath.split('/').some((segment) => {
    if (segment === '') return false;
    try {
      const decoded = decodeURIComponent(segment);
      return decoded === '.' || decoded === '..';
    } catch {
      return true;
    }
  });
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
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasOwn(value, key) {
  return Object.hasOwn(value, key);
}

function ownValue(value, key) {
  return hasOwn(value, key) ? value[key] : undefined;
}
