export type PreviewStatus = 'published' | 'draft';
export type PreviewDocumentType = 'plaintext' | 'markdown' | 'html';
export type PreviewMetaValue = string | number | boolean | null;
export type PreviewMediaDeliveryMode = 'none' | 'media_domain';
export type PreviewPermalinkOutputStyle = 'directory' | 'html-extension';

export interface PreviewPermalinksData {
  output_style?: PreviewPermalinkOutputStyle;
  posts?: string;
  pages?: string;
  categories?: string;
  tags?: string;
}

export type PreviewFrontPageType = 'theme_index' | 'page' | 'standalone_html';

export interface PreviewFrontPageData {
  type: PreviewFrontPageType;
  page_slug?: string;
  html?: string;
}

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
  media_base_url: string;
  media_delivery_mode?: PreviewMediaDeliveryMode;
  favicon?: PreviewSiteFaviconData;
  locale: string;
  posts_per_page: number;
  date_format: string;
  time_format: string;
  timezone: string;
  disallow_comments: boolean;
  indexing?: boolean;
  permalinks?: PreviewPermalinksData;
  front_page?: PreviewFrontPageData;
  post_index?: PreviewPostIndexData;
  footer?: PreviewSiteFooterData;
  meta?: Record<string, PreviewMetaValue>;
}

export interface PreviewSiteFaviconData {
  icon?: string;
  svg?: string;
  png?: string;
  apple_touch_icon?: string;
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
  path?: string;
  content: string;
  document_type: PreviewDocumentType;
  excerpt: string;
  published_at_iso: string;
  updated_at_iso: string;
  author_id: string;
  featured_image?: string;
  meta?: Record<string, PreviewMetaValue>;
  status: PreviewStatus;
  allow_comments: boolean;
  category_slugs: string[];
  tag_slugs: string[];
}

export interface PreviewPageData {
  title: string;
  slug: string;
  content: string;
  document_type: PreviewDocumentType;
  excerpt?: string;
  featured_image?: string;
  meta?: Record<string, PreviewMetaValue>;
  status: PreviewStatus;
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

export type PreviewMenuItemType = 'custom' | 'page' | 'post' | 'category';
export type PreviewMenuItemTarget = '_self' | '_blank';

export interface PreviewMenuItemData {
  title: string;
  url: string;
  type: PreviewMenuItemType;
  target: PreviewMenuItemTarget;
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

export interface PreviewCollectionItemData {
  type: PreviewCollectionItemType;
  slug: string;
}

export interface PreviewCollectionData {
  title?: string;
  description?: string;
  items: PreviewCollectionItemData[];
}

export interface PreviewCustomCssData {
  content: string;
}

export interface PreviewCustomHtmlSlotData {
  content: string;
}

export interface PreviewCustomHtmlData {
  head_end?: PreviewCustomHtmlSlotData;
  body_end?: PreviewCustomHtmlSlotData;
}

export interface PreviewContentData {
  authors: PreviewAuthorData[];
  posts: PreviewPostData[];
  pages: PreviewPageData[];
  categories: PreviewCategoryData[];
  tags: PreviewTagData[];
  media?: PreviewMediaData[];
}

export interface PreviewDataV06 {
  $schema?: string;
  version: '0.6';
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

export const PREVIEW_DATA_VERSION: '0.6';

export function validatePreviewData(data: unknown): PreviewDataValidationResult;
export function assertPreviewData<T>(data: T): T;
export function isPreviewData(data: unknown): data is PreviewDataV06;
