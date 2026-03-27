export type PreviewStatus = 'published' | 'draft';

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
  language: string;
  logo?: string;
  social?: Record<string, string>;
  [key: string]: unknown;
}

export interface PreviewPostData {
  id: string;
  public_id: number;
  title: string;
  slug: string;
  html: string;
  excerpt: string;
  published_at: string;
  updated_at: string;
  published_at_iso: string;
  updated_at_iso: string;
  reading_time: string;
  author_name: string;
  author_avatar?: string;
  featured_image?: string;
  categories_html: string;
  tags_html: string;
  comments_html: string;
  status: PreviewStatus;
}

export interface PreviewPageData {
  id: string;
  title: string;
  slug: string;
  html: string;
  status: PreviewStatus;
}

export interface PreviewCategoryData {
  id: string;
  name: string;
  slug: string;
  description?: string;
  postCount: number;
}

export interface PreviewTagData {
  id: string;
  name: string;
  slug: string;
  postCount: number;
}

export interface PreviewRouteBlocks {
  posts: string;
  pagination: string;
  categories?: string;
  tags?: string;
}

export interface PreviewCategoryRouteData {
  slug: string;
  posts: string;
  pagination: string;
  categories?: string;
}

export interface PreviewTagRouteData {
  slug: string;
  posts: string;
  pagination: string;
  tags?: string;
}

export interface PreviewContentData {
  posts: PreviewPostData[];
  pages: PreviewPageData[];
  categories: PreviewCategoryData[];
  tags: PreviewTagData[];
}

export interface PreviewRoutesData {
  index: PreviewRouteBlocks & {
    categories: string;
    tags: string;
  };
  archive: PreviewRouteBlocks;
  categories: PreviewCategoryRouteData[];
  tags: PreviewTagRouteData[];
}

export interface PreviewDataV02 {
  version: '0.2';
  generator: string;
  generated_at: string;
  site: PreviewSiteData;
  content: PreviewContentData;
  routes: PreviewRoutesData;
}

export interface PreviewDataValidationResult {
  ok: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

export const PREVIEW_DATA_VERSION: '0.2';

export function validatePreviewData(data: unknown): PreviewDataValidationResult;
export function assertPreviewData<T>(data: T): T;
export function isPreviewData(data: unknown): data is PreviewDataV02;
