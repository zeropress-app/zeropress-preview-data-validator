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
  mediaBaseUrl?: string;
  locale: string;
  postsPerPage: number;
  dateFormat: string;
  timeFormat: string;
  timezone: string;
  disallowComments: boolean;
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
  published_at_iso: string;
  updated_at_iso: string;
  author_name: string;
  author_avatar?: string;
  featured_image?: string;
  status: PreviewStatus;
  allow_comments: boolean;
  category_slugs: string[];
  tag_slugs: string[];
}

export interface PreviewPageData {
  id: string;
  title: string;
  slug: string;
  html: string;
  excerpt?: string;
  featured_image?: string;
  status: PreviewStatus;
}

export interface PreviewCategoryData {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

export interface PreviewTagData {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

export interface PreviewContentData {
  posts: PreviewPostData[];
  pages: PreviewPageData[];
  categories: PreviewCategoryData[];
  tags: PreviewTagData[];
}

export interface PreviewDataV04 {
  version: '0.4';
  generator: string;
  generated_at: string;
  site: PreviewSiteData;
  content: PreviewContentData;
}

export interface PreviewDataValidationResult {
  ok: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

export const PREVIEW_DATA_VERSION: '0.4';

export function validatePreviewData(data: unknown): PreviewDataValidationResult;
export function assertPreviewData<T>(data: T): T;
export function isPreviewData(data: unknown): data is PreviewDataV04;
