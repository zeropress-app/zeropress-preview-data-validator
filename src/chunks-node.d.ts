import type { PreviewDataSource, PreviewDataHeader, PreviewDataWorkStore } from './index.js';
import type { PreviewDataChunkManifest } from './chunks.js';
export interface FilePreviewDataSource extends PreviewDataSource {
  kind: 'json' | 'chunks'; inputPath: string; inputPaths: string[]; inputRoots: string[];
  manifest?: PreviewDataChunkManifest;
}
export function openPreviewDataSource(inputPath: string): Promise<FilePreviewDataSource>;
export function readPreviewDataHeader(inputPath: string): Promise<PreviewDataHeader>;
export function readBoundedJson(file: string, maxBytes: number, expected?: { bytes: number; sha256: string }): Promise<any>;
export function createDiskWorkStore(options?: { directory?: string; maxValueBytes?: number }): Promise<PreviewDataWorkStore & {
  directory: string; stats: { bytesWritten: number; bytesRead: number; maxValueBytes: number; records: number };
}>;
export function stagePreviewDataChunks(source: PreviewDataSource, outputPath: string, options?: { targetBytes?: number; preserveKeyOrder?: boolean }): Promise<{
  manifest: PreviewDataChunkManifest; text: string; outputPath: string; generationDirectory: string;
}>;
export function writePreviewDataChunks(source: PreviewDataSource, outputPath: string, options?: { targetBytes?: number; preserveKeyOrder?: boolean }): Promise<PreviewDataChunkManifest>;
export function writeJsonStream(handle: { write(buffer: Uint8Array, offset: number, length: number, position: number | null): Promise<{ bytesWritten: number }> }, value: unknown): Promise<void>;

/** Probe root keys without parsing the whole legacy file. */
export function isPreviewDataManifest(file: string): Promise<boolean>;
