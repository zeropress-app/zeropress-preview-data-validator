export type PreviewStatus = 'published' | 'draft';
export type PreviewDocumentType = 'plaintext' | 'markdown' | 'html';

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
  mediaBaseUrl: string;
  locale: string;
  postsPerPage: number;
  dateFormat: string;
  timeFormat: string;
  timezone: string;
  disallowComments: boolean;
  [key: string]: unknown;
}

export interface PreviewAuthorData {
  id: string;
  display_name: string;
  avatar?: string;
}

export interface PreviewPostData {
  id: string;
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

export interface PreviewCustomCssData {
  content: string;
}

export interface PreviewContentData {
  authors: PreviewAuthorData[];
  posts: PreviewPostData[];
  pages: PreviewPageData[];
  categories: PreviewCategoryData[];
  tags: PreviewTagData[];
}

export interface PreviewDataV05 {
  version: '0.5';
  generator: string;
  generated_at: string;
  site: PreviewSiteData;
  content: PreviewContentData;
  menus: Record<string, PreviewMenuData>;
  widgets: Record<string, PreviewWidgetAreaData>;
  custom_css?: PreviewCustomCssData;
}

export interface PreviewDataValidationResult {
  ok: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

export const PREVIEW_DATA_VERSION: '0.5';

export function validatePreviewData(data: unknown): PreviewDataValidationResult;
export function assertPreviewData<T>(data: T): T;
export function isPreviewData(data: unknown): data is PreviewDataV05;
