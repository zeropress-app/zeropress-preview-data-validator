import type { PreviewDataHeader, PreviewContentCollection, PreviewDataValidationResult } from './index.js';
export const CHUNK_FORMAT: 'zeropress-preview-data-chunks';
export const CHUNK_FORMAT_VERSION: 1;
export const CHUNK_TARGET_BYTES: number;
export const CHUNK_MAX_BYTES: number;
export const MANIFEST_MAX_BYTES: number;
export interface PreviewDataChunkDescriptor { file: string; records: number; bytes: number; sha256: string; }
export interface PreviewDataChunkCollection { count: number; chunks: PreviewDataChunkDescriptor[]; }
export interface PreviewDataChunkManifest {
  format: typeof CHUNK_FORMAT;
  format_version: typeof CHUNK_FORMAT_VERSION;
  generation: string;
  data: PreviewDataHeader;
  content: Record<Exclude<PreviewContentCollection, 'media'>, PreviewDataChunkCollection> & { media?: PreviewDataChunkCollection };
}
export function assertChunkManifest(value: unknown): PreviewDataChunkManifest;
export function assertRelativeChunkPath(value: unknown): string;
export function assertSourceCollections(value: unknown): void;
export function assertValidation(result: PreviewDataValidationResult, prefix?: string): void;
export function jsonFragments(value: unknown, depth?: number): Generator<string>;
export function stringifyBoundedJson(value: unknown, maxBytes: number, options?: { depth?: number; prefix?: string; suffix?: string }): string;
