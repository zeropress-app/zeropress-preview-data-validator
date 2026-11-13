import fs from 'node:fs/promises';
import { constants, createReadStream } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash, randomUUID } from 'node:crypto';
import {
  createObjectPreviewDataSource, createPreviewDataValidationSession,
  PREVIEW_CONTENT_COLLECTIONS, canonicalizePreviewDataKeyOrder, canonicalizePreviewDataRecord,
} from './index.js';
import {
  CHUNK_FORMAT, CHUNK_FORMAT_VERSION, CHUNK_TARGET_BYTES, CHUNK_MAX_BYTES, MANIFEST_MAX_BYTES,
  assertChunkManifest, assertRelativeChunkPath, assertSourceCollections, assertValidation,
  stringifyBoundedJson, jsonFragments,
} from './chunks.js';

export async function readBoundedJson(file, maxBytes, expected) {
  const handle = await fs.open(file, constants.O_RDONLY | (constants.O_NOFOLLOW || 0));
  try {
    const stat = await handle.stat();
    if (!stat.isFile()) throw new Error(`Expected a regular JSON file: ${file}`);
    if (stat.size > maxBytes || (expected && stat.size !== expected.bytes)) throw new Error(`JSON byte limit or size mismatch: ${file}`);
    const buffers = [];
    const hash = createHash('sha256');
    let total = 0;
    while (true) {
      const buffer = Buffer.allocUnsafe(Math.min(65536, maxBytes - total + 1));
      const { bytesRead } = await handle.read(buffer, 0, buffer.length, null);
      if (!bytesRead) break;
      total += bytesRead;
      if (total > maxBytes) throw new Error(`JSON exceeds ${maxBytes} byte limit: ${file}`);
      const part = buffer.subarray(0, bytesRead);
      buffers.push(part); hash.update(part);
    }
    const digest = hash.digest('hex');
    if (expected && (total !== expected.bytes || digest !== expected.sha256)) throw new Error(`Chunk integrity mismatch: ${file}`);
    try { return JSON.parse(Buffer.concat(buffers, total).toString('utf8')); }
    catch (error) { throw new Error(`Invalid JSON in ${file}: ${error.message}`, { cause: error }); }
  } finally { await handle.close(); }
}

async function checkedChild(root, relative) {
  assertRelativeChunkPath(relative);
  let current = root;
  for (const part of relative.split('/')) {
    current = path.join(current, part);
    const stat = await fs.lstat(current);
    if (stat.isSymbolicLink()) throw new Error(`Symlinks are not allowed in chunk input: ${current}`);
  }
  return current;
}

// Only retain root property names while probing. Legacy files can put content
// first, so do not buffer an arbitrary prefix or depend on object key order.
export async function isPreviewDataManifest(file) {
  let depth = 0, quoted = false, escaped = false, key = '', capture = false, expectKey = false;
  for await (const buffer of createReadStream(file, { encoding: 'utf8', highWaterMark: 65536 })) {
    for (const char of buffer) {
      if (quoted) {
        if (capture) {
          key += char;
          if (key.length > 512) return false; // Invalid legacy key; ordinary parser diagnoses it.
        }
        if (escaped) { escaped = false; continue; }
        if (char === '\\') { escaped = true; continue; }
        if (char === '"') {
          quoted = false;
          if (capture) {
            let name;
            try { name = JSON.parse('"' + key); } catch { return false; }
            if (['format', 'format_version', 'generation', 'data'].includes(name)) return true;
            if (['$schema', 'version', 'generator', 'generated_at', 'site'].includes(name)) return false;
            expectKey = false;
          }
          capture = false;
        }
      } else if (char === '"') {
        quoted = true; capture = depth === 1 && expectKey; key = '';
      } else if (char === '{' || char === '[') {
        depth++;
        if (depth === 1) expectKey = char === '{';
      } else if (char === '}' || char === ']') depth--;
      else if (char === ',' && depth === 1) expectKey = true;
    }
  }
  return false;
}

export async function openPreviewDataSource(inputPath) {
  const absolute = path.resolve(inputPath);
  const inputStat = await fs.stat(absolute);
  if (!inputStat.isFile()) throw new Error(`Preview-data path is not a file: ${absolute}`);
  if (!(await isPreviewDataManifest(absolute))) {
    const data = JSON.parse(await fs.readFile(absolute, 'utf8'));
    const source = createObjectPreviewDataSource(data);
    return { ...source, kind: 'json', inputPaths: [absolute], inputRoots: [], inputPath: absolute };
  }
  const manifest = assertChunkManifest(await readBoundedJson(absolute, MANIFEST_MAX_BYTES));
  const parent = await fs.realpath(path.dirname(absolute));
  const generation = await checkedChild(parent, manifest.generation);
  if (!(await fs.stat(generation)).isDirectory()) throw new Error('Chunk generation must be a directory');
  const collections = PREVIEW_CONTENT_COLLECTIONS.filter((key) => Object.hasOwn(manifest.content, key));
  const inputPaths = [absolute];
  for (const collection of collections) {
    for (const chunk of manifest.content[collection].chunks) inputPaths.push(path.join(generation, chunk.file));
  }
  let closed = false;
  return {
    kind: 'chunks', header: manifest.data, collections, inputPath: absolute,
    inputPaths, inputRoots: [generation], manifest,
    async *records(collection) {
      if (closed) throw new Error('Preview Data source is closed');
      const entry = manifest.content[collection];
      if (!entry) return;
      let index = 0;
      for (const chunk of entry.chunks) {
        // Recheck containment on every replay, then O_NOFOLLOW + exact digest.
        await checkedChild(parent, manifest.generation);
        const file = await checkedChild(generation, chunk.file);
        const records = await readBoundedJson(file, CHUNK_MAX_BYTES, chunk);
        if (!Array.isArray(records) || records.length !== chunk.records) throw new Error(`Chunk record count mismatch: ${file}`);
        for (const [localIndex, value] of records.entries()) {
          if (closed) throw new Error('Preview Data source is closed');
          yield { value, index: index++, location: { file, index: localIndex } };
        }
      }
      if (index !== entry.count) throw new Error(`Collection count mismatch: ${collection}`);
    },
    async close() { closed = true; },
  };
}

/** Header-only for chunk manifests; legacy JSON retains its whole-file cost. */
export async function readPreviewDataHeader(inputPath) {
  const source = await openPreviewDataSource(inputPath);
  try { return source.header; } finally { await source.close(); }
}

async function writeAll(handle, buffer, position = null) {
  let offset = 0;
  while (offset < buffer.length) {
    const { bytesWritten } = await handle.write(buffer, offset, buffer.length - offset, position === null ? null : position + offset);
    if (!bytesWritten) throw new Error('Short write to Preview Data storage');
    offset += bytesWritten;
  }
}

/** One append-only file avoids a filesystem entry per document. Caller owns close(). */
export async function createDiskWorkStore({ directory = os.tmpdir(), maxValueBytes = 128 * 1024 * 1024 } = {}) {
  if (!Number.isSafeInteger(maxValueBytes) || maxValueBytes < 1) throw new Error('Invalid work store byte limit');
  const dir = await fs.mkdtemp(path.join(directory, 'zeropress-work-'));
  const handle = await fs.open(path.join(dir, 'records.jsonl'), 'wx+', 0o600);
  let end = 0, closed = false, busy = false;
  const stats = { bytesWritten: 0, bytesRead: 0, maxValueBytes: 0, records: 0 };
  return {
    directory: dir, stats,
    async put(value) {
      if (closed || busy) throw new Error('Work store is closed or a write is already in progress');
      busy = true;
      try {
        const text = stringifyBoundedJson(value, maxValueBytes);
        const buffer = Buffer.from(text);
        const ref = { offset: end, bytes: buffer.length };
        await writeAll(handle, buffer, end);
        end += buffer.length;
        stats.bytesWritten = end; stats.maxValueBytes = Math.max(stats.maxValueBytes, buffer.length); stats.records++;
        return ref;
      } finally { busy = false; }
    },
    async get(ref) {
      if (closed) throw new Error('Work store is closed');
      if (!ref || !Number.isSafeInteger(ref.offset) || ref.offset < 0 || !Number.isSafeInteger(ref.bytes)
          || ref.bytes < 1 || ref.bytes > maxValueBytes || ref.offset + ref.bytes > end) throw new Error('Invalid work store reference');
      const buffer = Buffer.allocUnsafe(ref.bytes);
      let offset = 0;
      while (offset < buffer.length) {
        const { bytesRead } = await handle.read(buffer, offset, buffer.length - offset, ref.offset + offset);
        if (!bytesRead) throw new Error('Truncated work store');
        offset += bytesRead;
      }
      stats.bytesRead += offset;
      return JSON.parse(buffer.toString('utf8'));
    },
    async close() {
      if (closed) return;
      closed = true;
      try { await handle.close(); } finally { await fs.rm(dir, { recursive: true, force: true }); }
    },
  };
}

async function assertSafePartsDirectory(parent, basename) {
  // Parent itself may be reached through a user-selected symlink; children may not.
  const root = await fs.realpath(parent);
  const parts = path.join(root, basename);
  try {
    const stat = await fs.lstat(parts);
    if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error('Chunk parts path must be a plain directory');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    await fs.mkdir(parts);
  }
  return parts;
}

/** Finalize immutable parts, but leave the entry manifest for the caller's transaction. */
export async function stagePreviewDataChunks(source, outputPath, { targetBytes = CHUNK_TARGET_BYTES, preserveKeyOrder = false } = {}) {
  if (typeof preserveKeyOrder !== 'boolean') throw new TypeError('preserveKeyOrder must be a boolean');
  if (!Number.isSafeInteger(targetBytes) || targetBytes < 6 || targetBytes > CHUNK_MAX_BYTES) throw new Error('Invalid chunk target size');
  assertSourceCollections(source.collections);
  const session = createPreviewDataValidationSession(source.header);
  assertValidation(session.headerResult);
  const absolute = path.resolve(outputPath);
  await fs.mkdir(path.dirname(absolute), { recursive: true });
  const partsName = path.basename(absolute).replace(/(?:\.manifest)?\.json$/, '') + '.parts';
  const parts = await assertSafePartsDirectory(path.dirname(absolute), partsName);
  const staging = await fs.mkdtemp(path.join(parts, '.stage-'));
  const content = {};
  let stageExists = true;
  try {
    for (const collection of PREVIEW_CONTENT_COLLECTIONS.filter((key) => source.collections.includes(key))) {
      const entry = { count: 0, chunks: [] }; content[collection] = entry;
      let texts = [], bytes = 5;
      const flush = async () => {
        if (!texts.length) return;
        const file = `${collection}/${String(entry.chunks.length + 1).padStart(6, '0')}.json`;
        const text = '[\n' + texts.join(',\n') + '\n]\n';
        const buffer = Buffer.from(text);
        await fs.mkdir(path.dirname(path.join(staging, file)), { recursive: true });
        await fs.writeFile(path.join(staging, file), buffer, { flag: 'wx', mode: 0o600 });
        entry.chunks.push({ file, records: texts.length, bytes: buffer.length, sha256: createHash('sha256').update(buffer).digest('hex') });
        texts = []; bytes = 5;
      };
      for await (const record of source.records(collection)) {
        if (record.index !== entry.count) throw new Error(`Nonsequential record index: ${collection}`);
        assertValidation(session.add(collection, record.value));
        const value = preserveKeyOrder ? record.value : canonicalizePreviewDataRecord(collection, record.value);
        let text;
        try { text = stringifyBoundedJson(value, CHUNK_MAX_BYTES - 5, { depth: 1, prefix: '  ', suffix: '' }); }
        catch (error) {
          if (!error.message.startsWith('JSON exceeds ')) throw error;
          throw Object.assign(new Error(`Chunk record too large at content.${collection}[${record.index}]: ${error.message}`), { code: 'PREVIEW_DATA_CHUNK_TOO_LARGE' }); }
        const length = Buffer.byteLength(text);
        if (texts.length && bytes + 2 + length > targetBytes) await flush();
        bytes += (texts.length ? 2 : 0) + length;
        texts.push(text); entry.count++;
      }
      await flush();
    }
    assertValidation(session.finish());
    const data = preserveKeyOrder ? source.header : canonicalizePreviewDataKeyOrder(source.header);
    const body = { format: CHUNK_FORMAT, format_version: CHUNK_FORMAT_VERSION, data, content };
    const encodeManifest = value => {
      try { return stringifyBoundedJson(value, MANIFEST_MAX_BYTES); }
      catch (error) {
        if (!error.message.startsWith('JSON exceeds ')) throw error;
        throw Object.assign(error, { code: 'PREVIEW_DATA_MANIFEST_TOO_LARGE' });
      }
    };
    const digest = createHash('sha256').update(encodeManifest(body)).digest('hex');
    const generation = `${partsName}/g-${digest}`;
    const manifest = assertChunkManifest({ format: CHUNK_FORMAT, format_version: CHUNK_FORMAT_VERSION, generation, data, content });
    const text = encodeManifest(manifest);
    const final = path.join(parts, `g-${digest}`);
    try { await fs.rename(staging, final); stageExists = false; }
    catch (error) {
      if (!['EEXIST', 'ENOTEMPTY'].includes(error.code)) throw error;
      // Identical imports reuse immutable generations only after checking their bytes.
      for (const entry of Object.values(content)) for (const chunk of entry.chunks) {
        await checkedChild(parts, `g-${digest}`);
        await readBoundedJson(await checkedChild(final, chunk.file), CHUNK_MAX_BYTES, chunk);
      }
    }
    return { manifest, text, outputPath: absolute, generationDirectory: final };
  } finally {
    if (stageExists) await fs.rm(staging, { recursive: true, force: true });
  }
}

export async function writePreviewDataChunks(source, outputPath, options) {
  const staged = await stagePreviewDataChunks(source, outputPath, options);
  const temporary = `${staged.outputPath}.${randomUUID()}.tmp`;
  try {
    try { if ((await fs.lstat(staged.outputPath)).isSymbolicLink()) throw new Error('Manifest output may not be a symlink'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    await fs.writeFile(temporary, staged.text, { flag: 'wx', mode: 0o600 });
    await fs.rename(temporary, staged.outputPath);
    return staged.manifest;
  } finally { await fs.rm(temporary, { force: true }); }
}

/** Stream large diagnostic arrays without a whole-document JSON string. */
export async function writeJsonStream(handle, value) {
  let batch = '', bytes = 0;
  for (const fragment of jsonFragments(value)) {
    batch += fragment; bytes += Buffer.byteLength(fragment);
    if (bytes >= 65536) { await writeAll(handle, Buffer.from(batch)); batch = ''; bytes = 0; }
  }
  await writeAll(handle, Buffer.from(batch + '\n'));
}
