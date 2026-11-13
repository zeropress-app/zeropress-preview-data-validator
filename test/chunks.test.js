import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createObjectPreviewDataSource, createPreviewDataValidationSession, canonicalizePreviewDataKeyOrder } from '../src/index.js';
import { stringifyBoundedJson, assertChunkManifest, assertRelativeChunkPath, CHUNK_MAX_BYTES } from '../src/chunks.js';
import { openPreviewDataSource, writePreviewDataChunks, createDiskWorkStore, readBoundedJson, writeJsonStream } from '../src/chunks-node.js';

function fixture(count = 4) {
  return {
    version: '0.7', generator: 'test', generated_at: '2026-01-01T00:00:00Z',
    site: { title: 'Example', description: '', url: 'https://example.com', media_origin: '', locale: 'en', posts_per_page: 10, date_style: 'medium', time_style: 'none', timezone: 'UTC' },
    content: {
      authors: [{ id: 'writer', display_name: 'Example Writer' }],
      posts: Array.from({ length: count }, (_, n) => ({ public_id: n + 1, title: `Post ${n}`, slug: `post-${n}`, content: '한글 😀 " \\ \n'.repeat(30), document_type: 'plaintext', excerpt: '', published_at_iso: '2026-01-01T00:00:00Z', updated_at_iso: '2026-01-01T00:00:00Z', author_id: 'writer', status: 'published', category_slugs: [], tag_slugs: [], meta: { nullable: null }, data: { active: false } })),
      pages: [], categories: [], tags: [], media: [],
    },
  };
}
async function temporary(t) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'preview-chunks-test-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  return dir;
}
async function materialize(source) {
  const data = { ...source.header, content: {} };
  for (const key of source.collections) {
    data.content[key] = [];
    for await (const { value } of source.records(key)) data.content[key].push(value);
  }
  return data;
}

test('bounded JSON serialization preserves Unicode, escaping, indentation and boundaries', () => {
  const data = { a: 'x'.repeat(8191) + '😀\ud800\udc00\ud800\u0000\b\n"\\', array: [null, false, 1, { z: '한글' }], empty: {}, missing: undefined };
  const expected = JSON.stringify(data, null, 2) + '\n';
  const bytes = Buffer.byteLength(expected);
  assert.equal(stringifyBoundedJson(data, bytes), expected);
  assert.throws(() => stringifyBoundedJson(data, bytes - 1), /byte limit/);
  const original = JSON.stringify;
  try {
    JSON.stringify = (value, ...args) => {
      if (typeof value === 'string' && value.length > 8192) throw new Error('unbounded string');
      return original(value, ...args);
    };
    assert.throws(() => stringifyBoundedJson('x'.repeat(100000), 100), /byte limit/);
  } finally { JSON.stringify = original; }
});

test('incremental validation resolves forward authors and detects cross-chunk identities/references', () => {
  const data = fixture(); const { content, ...header } = data;
  const session = createPreviewDataValidationSession(header);
  assert.equal(session.add('posts', content.posts[0]).ok, true);
  assert.equal(session.add('authors', content.authors[0]).ok, true);
  assert.equal(session.finish().ok, true);
  const invalid = createPreviewDataValidationSession(header);
  invalid.add('posts', content.posts[0]);
  const duplicate = invalid.add('posts', content.posts[0]);
  assert.ok(duplicate.errors.some((error) => error.code === 'DUPLICATE_POST_PUBLIC_ID'));
  assert.ok(invalid.finish().errors.some((error) => error.code === 'INVALID_POST_AUTHOR_REFERENCE'));
  const references = createPreviewDataValidationSession({ ...header, collections: { selected: { items: [{ type: 'post', slug: 'missing' }] } } });
  assert.equal(references.finish().errors[0].code, 'INVALID_COLLECTION_ITEM_REFERENCE');
  assert.equal(createPreviewDataValidationSession({ ...header, unexpected: true }).headerResult.ok, false);
});

test('chunk round trip preserves values, collection order and absent/empty media', async (t) => {
  const dir = await temporary(t), file = path.join(dir, 'preview.manifest.json');
  const data = fixture();
  const manifest = await writePreviewDataChunks(createObjectPreviewDataSource(data), file, { targetBytes: 1200 });
  assert.ok(manifest.content.posts.chunks.length > 1);
  assert.equal(manifest.content.media.count, 0);
  const source = await openPreviewDataSource(file);
  assert.deepEqual(canonicalizePreviewDataKeyOrder(await materialize(source)), canonicalizePreviewDataKeyOrder(data));
  assert.deepEqual(await materialize(source), await materialize(source));
  await source.close();
  await assert.rejects(() => materialize(source), /closed/);
  delete data.content.media;
  const absent = await writePreviewDataChunks(createObjectPreviewDataSource(data), file);
  assert.equal(Object.hasOwn(absent.content, 'media'), false);
});

test('reader captures a generation and identical writes reuse it', async (t) => {
  const dir = await temporary(t), file = path.join(dir, 'preview.json'), data = fixture();
  const first = await writePreviewDataChunks(createObjectPreviewDataSource(data), file);
  const source = await openPreviewDataSource(file);
  const same = await writePreviewDataChunks(createObjectPreviewDataSource(data), file);
  assert.equal(first.generation, same.generation);
  data.content.posts[0].content = 'New version';
  const changed = await writePreviewDataChunks(createObjectPreviewDataSource(data), file);
  assert.notEqual(first.generation, changed.generation);
  assert.deepEqual(await materialize(source), canonicalizePreviewDataKeyOrder(fixture()));
  await source.close();
});

test('late validation failure preserves the committed manifest and cleans staging', async (t) => {
  const dir = await temporary(t), file = path.join(dir, 'preview.json'), data = fixture();
  await writePreviewDataChunks(createObjectPreviewDataSource(data), file);
  const before = await fs.readFile(file);
  data.content.posts[3].author_id = 'missing';
  await assert.rejects(() => writePreviewDataChunks(createObjectPreviewDataSource(data), file, { targetBytes: 1200 }), /INVALID_POST_AUTHOR_REFERENCE/);
  assert.deepEqual(await fs.readFile(file), before);
  assert.ok((await fs.readdir(path.join(dir, 'preview.parts'))).every((name) => !name.startsWith('.stage-')));
});

test('manifest and reader reject traversal, unsupported formats, count lies, corruption and symlinks', async (t) => {
  const dir = await temporary(t), file = path.join(dir, 'preview.json');
  const manifest = await writePreviewDataChunks(createObjectPreviewDataSource(fixture()), file);
  for (const invalid of ['../x', '/x', 'x/../y', 'x\\y', 'https://example.com/x', 'x//y', 'x\0']) assert.throws(() => assertRelativeChunkPath(invalid));
  assert.throws(() => assertChunkManifest({ ...manifest, format_version: 2 }), /Unsupported/);
  const bad = structuredClone(manifest); bad.content.posts.count++;
  assert.throws(() => assertChunkManifest(bad), /count mismatch/);
  const source = await openPreviewDataSource(file);
  const chunk = path.join(dir, manifest.generation, manifest.content.posts.chunks[0].file);
  const original = await fs.readFile(chunk);
  await fs.writeFile(chunk, Buffer.from(original.toString().replace('Post 0', 'Post X')));
  await assert.rejects(() => materialize(source), /integrity mismatch/);
  await fs.writeFile(path.join(dir, 'other.json'), original);
  await fs.unlink(chunk); await fs.symlink(path.join(dir, 'other.json'), chunk);
  await assert.rejects(() => materialize(source), /Symlinks/);
  await source.close();
});

test('bounded reads reject oversized files without loading them', async (t) => {
  const dir = await temporary(t), file = path.join(dir, 'large.json');
  const handle = await fs.open(file, 'w'); await handle.truncate(CHUNK_MAX_BYTES + 1); await handle.close();
  await assert.rejects(() => readBoundedJson(file, CHUNK_MAX_BYTES), /byte limit/);
});

test('work store supports bounded random reads and removes owned storage', async (t) => {
  const dir = await temporary(t), store = await createDiskWorkStore({ directory: dir, maxValueBytes: 100 });
  const first = await store.put({ a: '첫 번째' }); const second = await store.put({ a: 'Second' });
  assert.deepEqual(await store.get(first), { a: '첫 번째' });
  assert.deepEqual(await store.get(second), { a: 'Second' });
  await assert.rejects(() => store.put({ large: 'x'.repeat(101) }), /byte limit/);
  await assert.rejects(() => store.get({ offset: -1, bytes: 10 }), /reference/);
  await store.close();
  await assert.rejects(() => fs.stat(store.directory), { code: 'ENOENT' });
});

test('streaming report writer keeps JSON.stringify bytes and legacy source accepts content-first JSON', async (t) => {
  const dir = await temporary(t), file = path.join(dir, 'data.json');
  const { content, ...header } = fixture(); const data = { content, ...header };
  const handle = await fs.open(file, 'wx');
  await writeJsonStream(handle, data); await handle.close();
  assert.equal(await fs.readFile(file, 'utf8'), JSON.stringify(data, null, 2) + '\n');
  const source = await openPreviewDataSource(file);
  assert.equal(source.kind, 'json'); assert.deepEqual(await materialize(source), data);
});

test('optional key preservation keeps authored maps without changing canonical defaults', async (t) => {
  const dir = await temporary(t), data = fixture(1);
  data.content.posts[0].data = { zebra: { z: 1, a: 2 }, alpha: false };
  data.menus = { zebra: { name: 'Z', items: [] }, alpha: { name: 'A', items: [] } };
  const file = path.join(dir, 'preserved.manifest.json');
  await writePreviewDataChunks(createObjectPreviewDataSource(data), file, { preserveKeyOrder: true });
  const source = await openPreviewDataSource(file);
  t.after(() => source.close());
  const decoded = await materialize(source);
  assert.deepEqual(Object.keys(decoded.menus), ['zebra', 'alpha']);
  assert.deepEqual(Object.keys(decoded.content.posts[0].data), ['zebra', 'alpha']);
  assert.deepEqual(Object.keys(decoded.content.posts[0].data.zebra), ['z', 'a']);
  await writePreviewDataChunks(createObjectPreviewDataSource(data), path.join(dir, 'canonical.manifest.json'));
  const canonical = await openPreviewDataSource(path.join(dir, 'canonical.manifest.json'));
  t.after(() => canonical.close());
  assert.deepEqual(Object.keys(canonical.header.menus), ['alpha', 'zebra']);
  await assert.rejects(writePreviewDataChunks(createObjectPreviewDataSource(data), file, { preserveKeyOrder: 'true' }), TypeError);
});

test('transport size errors are distinguishable from invalid content', async (t) => {
  const dir = await temporary(t), file = path.join(dir, 'large.manifest.json');
  const data = fixture(1);
  data.content.posts[0].content = 'a'.repeat(CHUNK_MAX_BYTES);
  await assert.rejects(writePreviewDataChunks(createObjectPreviewDataSource(data), file), { code: 'PREVIEW_DATA_CHUNK_TOO_LARGE' });
  data.content.posts[0].content = 'valid';
  data.site.front_page = { type: 'standalone_html', html: '<p>' + 'a'.repeat(16 * 1024 * 1024) + '</p>' };
  await assert.rejects(writePreviewDataChunks(createObjectPreviewDataSource(data), file), { code: 'PREVIEW_DATA_MANIFEST_TOO_LARGE' });
  delete data.site.front_page;
  data.content.posts[0].status = 'invalid';
  await assert.rejects(writePreviewDataChunks(createObjectPreviewDataSource(data), file), error => !error.code?.includes('TOO_LARGE'));
  await assert.rejects(fs.access(file), { code: 'ENOENT' });
});
