import { PREVIEW_CONTENT_COLLECTIONS, validatePreviewDataHeader } from './index.js';

export const CHUNK_FORMAT = 'zeropress-preview-data-chunks';
export const CHUNK_FORMAT_VERSION = 1;
export const CHUNK_TARGET_BYTES = 4 * 1024 * 1024;
export const CHUNK_MAX_BYTES = 32 * 1024 * 1024;
export const MANIFEST_MAX_BYTES = 16 * 1024 * 1024;

export function assertValidation(result, prefix = 'Invalid preview-data') {
  if (result.ok) return;
  const error = result.errors[0];
  throw new Error(`${prefix}: ${error.code} ${error.path}: ${error.message}`);
}

export function assertSourceCollections(collections) {
  if (!Array.isArray(collections) || new Set(collections).size !== collections.length
      || collections.some((key) => !PREVIEW_CONTENT_COLLECTIONS.includes(key))
      || PREVIEW_CONTENT_COLLECTIONS.slice(0, 5).some((key) => !collections.includes(key))) {
    throw new Error('Invalid preview-data: required collections are authors, posts, pages, categories and tags; only media is optional');
  }
}

export function assertRelativeChunkPath(value) {
  if (typeof value !== 'string' || !value || /[\\:\u0000-\u001f\u007f]/.test(value)
      || value.split('/').some((part) => !part || part === '.' || part === '..')) {
    throw new Error('Invalid chunk path: expected a local relative path without traversal');
  }
  return value;
}

function closed(value, keys, where) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
      || Object.keys(value).some((key) => !keys.includes(key))
      || keys.some((key) => !Object.hasOwn(value, key))) {
    throw new Error(`Invalid chunk manifest: ${where}`);
  }
}

export function assertChunkManifest(manifest) {
  closed(manifest, ['format', 'format_version', 'generation', 'data', 'content'], 'root fields');
  if (manifest.format !== CHUNK_FORMAT || manifest.format_version !== CHUNK_FORMAT_VERSION) {
    throw new Error('Unsupported Preview Data chunk format or version');
  }
  assertRelativeChunkPath(manifest.generation);
  assertValidation(validatePreviewDataHeader(manifest.data));
  if (!manifest.content || typeof manifest.content !== 'object' || Array.isArray(manifest.content)) throw new Error('Invalid chunk manifest: content');
  assertSourceCollections(Object.keys(manifest.content));
  const files = new Set();
  for (const [collection, entry] of Object.entries(manifest.content)) {
    closed(entry, ['count', 'chunks'], collection);
    if (!Number.isSafeInteger(entry.count) || entry.count < 0 || !Array.isArray(entry.chunks)) throw new Error('Invalid chunk manifest: collection count/chunks');
    let count = 0;
    for (const chunk of entry.chunks) {
      closed(chunk, ['file', 'records', 'bytes', 'sha256'], 'chunk descriptor');
      assertRelativeChunkPath(chunk.file);
      if (files.has(chunk.file)) throw new Error('Invalid chunk manifest: duplicate chunk file');
      files.add(chunk.file);
      if (!Number.isSafeInteger(chunk.records) || chunk.records < 1
          || !Number.isSafeInteger(chunk.bytes) || chunk.bytes < 1 || chunk.bytes > CHUNK_MAX_BYTES
          || typeof chunk.sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(chunk.sha256)) {
        throw new Error('Invalid chunk manifest: records, bytes or SHA-256');
      }
      count += chunk.records;
      if (!Number.isSafeInteger(count)) throw new Error('Invalid chunk manifest: count overflow');
    }
    if (count !== entry.count) throw new Error(`Invalid chunk manifest: ${collection} count mismatch`);
  }
  return manifest;
}

// Keep string tokens bounded, including escaping and surrogate pairs. This is
// ordinary JSON.stringify formatting, not a new JSON dialect or a full string.
export function* jsonFragments(value, depth = 0, parents = new Set()) {
  if (typeof value === 'string') {
    yield '"';
    for (let start = 0; start < value.length;) {
      let end = Math.min(start + 8192, value.length);
      const last = value.charCodeAt(end - 1), next = value.charCodeAt(end);
      if (end < value.length && last >= 0xd800 && last <= 0xdbff && next >= 0xdc00 && next <= 0xdfff) end--;
      yield JSON.stringify(value.slice(start, end)).slice(1, -1);
      start = end;
    }
    yield '"';
    return;
  }
  if (value === null || typeof value !== 'object') {
    const scalar = JSON.stringify(value);
    if (scalar === undefined) throw new TypeError('Value is not JSON serializable');
    yield scalar;
    return;
  }
  if (parents.has(value)) throw new TypeError('Circular JSON value');
  parents.add(value);
  const array = Array.isArray(value);
  const keys = array ? null : Object.keys(value).filter((key) => value[key] !== undefined && typeof value[key] !== 'function' && typeof value[key] !== 'symbol');
  const length = array ? value.length : keys.length;
  yield array ? '[' : '{';
  for (let index = 0; index < length; index++) {
    yield (index ? ',\n' : '\n') + '  '.repeat(depth + 1);
    if (!array) {
      yield* jsonFragments(keys[index], depth + 1, parents);
      yield ': ';
    }
    const entry = value[array ? index : keys[index]];
    yield* jsonFragments(array && (entry === undefined || typeof entry === 'function' || typeof entry === 'symbol') ? null : entry, depth + 1, parents);
  }
  if (length) yield '\n' + '  '.repeat(depth);
  yield array ? ']' : '}';
  parents.delete(value);
}

const encoder = new TextEncoder();
export function stringifyBoundedJson(value, maxBytes, { depth = 0, prefix = '', suffix = '\n' } = {}) {
  let bytes = encoder.encode(prefix).length + encoder.encode(suffix).length;
  if (bytes > maxBytes) throw new Error(`JSON exceeds ${maxBytes} byte limit`);
  // Measure before assembling. A huge scalar never creates a huge JSON string.
  for (const fragment of jsonFragments(value, depth)) {
    bytes += encoder.encode(fragment).length;
    if (bytes > maxBytes) throw new Error(`JSON exceeds ${maxBytes} byte limit`);
  }
  return prefix + Array.from(jsonFragments(value, depth)).join('') + suffix;
}
