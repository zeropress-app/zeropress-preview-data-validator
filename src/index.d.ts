export type PreviewStatus = 'published' | 'draft';
export type PreviewDocumentType = 'plaintext' | 'markdown' | 'html';
export type PreviewDiscoverability = 'default' | 'noindex' | 'delist';
export type PreviewMetaValue = string | number | boolean | null;
export type PreviewStructuredDataValue =
  | string
  | number
  | boolean
  | null
  | PreviewStructuredDataValue[]
  | { [key: string]: PreviewStructuredDataValue };
export type PreviewMediaDeliveryMode = 'none' | 'media_domain';
export type PreviewDatetimeStyle = 'none' | 'short' | 'medium' | 'long' | 'full';
export type PreviewPermalinkOutputStyle = 'directory' | 'html-extension';
export type PreviewCommentsProvider = 'zeropress' | 'wordpress';
export type PreviewCommentsOrder = 'asc' | 'desc';

export interface PreviewPermalinksData {
  output_style?: PreviewPermalinkOutputStyle;
  posts?: string;
  pages?: string;
  categories?: string;
  tags?: string;
}

export type PreviewFrontPageType = 'theme_index' | 'page' | 'standalone_html';
export type PreviewFrontPageData =
  | { type: 'theme_index' }
  | { type: 'page'; page_path: string }
  | { type: 'standalone_html'; html: string };

export interface PreviewPostIndexData {
  enabled?: boolean;
  path?: string;
  paginate?: boolean;
}

export interface ValidationIssue {
  code: string;
  path: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface PreviewSiteData {
  title: string;
  description: string;
  url: string;
  media_origin: string;
  media_delivery_mode?: PreviewMediaDeliveryMode;
  favicon?: PreviewSiteFaviconData;
  logo?: PreviewSiteLogoData;
  newsletter?: PreviewSiteNewsletterData;
  comments?: PreviewSiteCommentsData;
  expose_generator?: boolean;
  search?: PreviewSiteFeatureStateData;
  feed?: PreviewSiteFeatureStateData;
  archive?: PreviewSiteFeatureStateData;
  locale: string;
  posts_per_page: number;
  date_style: PreviewDatetimeStyle;
  time_style: PreviewDatetimeStyle;
  timezone: string;
  robots?: PreviewSiteRobotsData;
  permalinks?: PreviewPermalinksData;
  front_page?: PreviewFrontPageData;
  post_index?: PreviewPostIndexData;
  footer?: PreviewSiteFooterData;
  meta?: Record<string, PreviewMetaValue>;
}

export interface PreviewSiteFaviconData {
  icon?: string;
  icon_dark?: string;
  svg?: string;
  png?: string;
  apple_touch_icon?: string;
}

export interface PreviewSiteLogoData {
  src: string;
  alt?: string;
}

export interface PreviewSiteNewsletterData {
  enabled: boolean;
  title?: string;
  description?: string;
  button_label?: string;
  signup_url?: string;
  embed_url?: string;
}

export interface PreviewCommentsThreadingData {
  enabled?: boolean;
  max_depth?: number;
}

export interface PreviewSiteFeatureStateData {
  enabled: boolean;
}

export interface PreviewSiteRobotsData {
  allow_indexing: boolean;
}

export interface PreviewSiteCommentsData {
  enabled: boolean;
  api_base_url: string;
  provider?: PreviewCommentsProvider;
  per_page?: number;
  order?: PreviewCommentsOrder;
  threading?: PreviewCommentsThreadingData;
}

export interface PreviewContentCommentsData {
  request_token: string;
}

export interface PreviewSiteFooterData {
  copyright_text?: string;
  attribution?: boolean;
}

export interface PreviewAuthorData {
  id: string;
  display_name: string;
  avatar?: string;
}

export interface PreviewMediaData {
  src: string;
  width: number;
  height: number;
  alt?: string;
}

export interface PreviewPostData {
  public_id: number;
  title: string;
  slug: string;
  content: string;
  document_type: PreviewDocumentType;
  excerpt: string;
  published_at_iso: string;
  updated_at_iso: string;
  author_id: string;
  featured_image?: string;
  meta?: Record<string, PreviewMetaValue>;
  data?: Record<string, PreviewStructuredDataValue>;
  status: PreviewStatus;
  discoverability?: PreviewDiscoverability;
  allow_comments?: boolean;
  comments?: PreviewContentCommentsData;
  category_slugs: string[];
  /** Ordered display sequence, unique after NFC normalization. The first entry is not implicitly a primary or SEO tag. */
  tag_slugs: string[];
}

export interface PreviewPageData {
  public_id?: number;
  title: string;
  slug: string;
  path?: string;
  content: string;
  document_type: PreviewDocumentType;
  excerpt?: string;
  featured_image?: string;
  updated_at_iso?: string;
  meta?: Record<string, PreviewMetaValue>;
  data?: Record<string, PreviewStructuredDataValue>;
  status: PreviewStatus;
  discoverability?: PreviewDiscoverability;
  allow_comments?: boolean;
  comments?: PreviewContentCommentsData;
}

export interface PreviewCategoryData {
  name: string;
  slug: string;
  description?: string;
}

export interface PreviewTagData {
  name: string;
  slug: string;
  description?: string;
}

export type PreviewMenuItemTarget = '_self' | '_blank';

export interface PreviewMenuItemData {
  title: string;
  url: string;
  target: PreviewMenuItemTarget;
  meta?: Record<string, PreviewMetaValue>;
  children: PreviewMenuItemData[];
}

export interface PreviewMenuData {
  name: string;
  items: PreviewMenuItemData[];
}

export interface PreviewWidgetItemData {
  type: string;
  title: string;
  settings?: Record<string, unknown>;
}

export interface PreviewWidgetAreaData {
  name: string;
  items: PreviewWidgetItemData[];
}

export type PreviewCollectionItemType = 'post' | 'page';

export interface PreviewCollectionPostItemData {
  type: 'post';
  slug: string;
}

export interface PreviewCollectionPageItemData {
  type: 'page';
  path: string;
}

export type PreviewCollectionItemData = PreviewCollectionPostItemData | PreviewCollectionPageItemData;

export interface PreviewCollectionData {
  title?: string;
  description?: string;
  items: PreviewCollectionItemData[];
}

export interface PreviewCustomCssData {
  content: string;
}

export interface PreviewCustomHtmlData {
  head_end?: string;
  body_end?: string;
}

export interface PreviewContentData {
  authors: PreviewAuthorData[];
  posts: PreviewPostData[];
  pages: PreviewPageData[];
  categories: PreviewCategoryData[];
  /** Global definitions in stable name/slug order; array position has no semantic meaning. */
  tags: PreviewTagData[];
  media?: PreviewMediaData[];
}

export interface PreviewDataV07 {
  $schema?: string;
  version: '0.7';
  generator: string;
  generated_at: string;
  site: PreviewSiteData;
  content: PreviewContentData;
  menus?: Record<string, PreviewMenuData>;
  widgets?: Record<string, PreviewWidgetAreaData>;
  collections?: Record<string, PreviewCollectionData>;
  custom_css?: PreviewCustomCssData;
  custom_html?: PreviewCustomHtmlData;
}

export interface PreviewDataValidationResult {
  ok: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

export const PREVIEW_DATA_VERSION: '0.7';

export function canonicalizePreviewDataKeyOrder<T>(data: T): T;
export function validatePreviewData(data: unknown): PreviewDataValidationResult;
export function assertPreviewData<T>(data: T): T;
export function isPreviewData(data: unknown): data is PreviewDataV07;
