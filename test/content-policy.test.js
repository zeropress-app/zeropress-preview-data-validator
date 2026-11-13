import test from 'node:test';
import assert from 'node:assert/strict';
import { BodyByteCounter, checkBodySize, assertBodyBytes, createBodyWarningCollector, BODY_WARNING_BYTES as WARN, normalizeBodyPolicy } from '../src/content-policy.js';

const LIMIT = 1024 * 1024;

for (const bytes of [WARN - 1, WARN, WARN + 1, LIMIT - 1, LIMIT, LIMIT + 1]) {
  test(`explicit UTF-8 body limit boundary ${bytes}`, () => {
    const body = 'a'.repeat(bytes);
    const policy = { maxBodyBytes: LIMIT };
    if (bytes > LIMIT) {
      assert.throws(() => checkBodySize(body, 'post:1', 'content', policy), { code: 'CONTENT_BODY_TOO_LARGE' });
      assert.throws(() => assertBodyBytes(bytes, 'post:1', 'content', policy), { code: 'CONTENT_BODY_TOO_LARGE' });
    }
    else {
      assert.equal(checkBodySize(body, 'post:1', 'content', policy), bytes);
      assert.equal(assertBodyBytes(bytes, 'post:1', 'content', policy), bytes);
      const c = createBodyWarningCollector(); c.add('post:1', bytes);
      assert.equal(c.warnings().length, bytes >= WARN ? 1 : 0);
    }
  });
}
test('counting matches UTF-8 across every split, without encoding a full copy', () => {
  for (const text of ['한글 😀 e\u0301 "\\\r\n\t<>', '\ud800x\udfff', 'a😀b', '\ud800\ud800\udfff']) {
    for (let i = 0; i <= text.length; i++) {
      const counter = new BodyByteCounter(); counter.write(text.slice(0, i)); counter.write(text.slice(i));
      assert.equal(counter.finish(), Buffer.byteLength(text));
    }
  }
  const c = new BodyByteCounter({ maxBodyBytes: LIMIT }); c.write('한'.repeat(LIMIT)); c.write('discarded'.repeat(LIMIT));
  assert.equal(c.finish(), LIMIT + 1);
  assert.equal(c.exceeded, true);
});

test('omitted policies count bodies above 1 MiB and still report large-body warnings', () => {
  const body = '한😀'.repeat(Math.ceil(LIMIT / 7));
  const bytes = Buffer.byteLength(body);
  assert.ok(bytes > LIMIT);
  assert.equal(checkBodySize(body, 'post:1'), bytes);
  assert.equal(assertBodyBytes(bytes, 'post:1'), bytes);
  const counter = new BodyByteCounter();
  counter.write(body.slice(0, 2));
  counter.write(body.slice(2));
  assert.equal(counter.finish(), bytes);
  assert.equal(counter.exceeded, false);
  const collector = createBodyWarningCollector();
  collector.add('post:1', checkBodySize(body, 'post:1'));
  assert.deepEqual(collector.warnings().map(({ code, count, maxBodyBytes, affected }) => ({ code, count, maxBodyBytes, affected })), [
    { code: 'CONTENT_BODY_LARGE', count: 1, maxBodyBytes: bytes, affected: ['post:1'] },
  ]);
});

test('undefined, empty and no-maximum policies have the same unlimited default', () => {
  const body = 'x'.repeat(LIMIT + 1);
  for (const policy of [undefined, {}, { maxBodyBytes: undefined }, { maxBodyBytes: null }, normalizeBodyPolicy()]) {
    assert.equal(checkBodySize(body, 'post:1', undefined, policy), body.length);
    assert.equal(assertBodyBytes(body.length, 'post:1', undefined, policy), body.length);
    const counter = new BodyByteCounter(policy);
    counter.write(body);
    assert.equal(counter.finish(), body.length);
    assert.equal(counter.exceeded, false);
  }
});

test('warning examples are bounded and identifiers are single-line', () => {
  const c = createBodyWarningCollector();
  for (let i = 0; i < 25; i++) c.add(`post:${i}\n`, WARN);
  const [w] = c.warnings();
  assert.equal(w.count, 25); assert.equal(w.affected.length, 20); assert.equal(w.omittedExamples, 5);
  assert.ok(w.affected.every(id => !id.includes('\n')));
});

test('optional maxima count full UTF-8 bodies and keep finite lower bounds', () => {
  for (const bytes of [4 * LIMIT - 1, 4 * LIMIT, 4 * LIMIT + 1, 5 * LIMIT]) {
    const unit = '한😀', body = unit.repeat(Math.floor(bytes / 7)) + 'a'.repeat(bytes % 7);
    for (const maxBodyBytes of [undefined, null, 4 * LIMIT]) {
      const policy = normalizeBodyPolicy({ maxBodyBytes });
      const counter = new BodyByteCounter(policy);
      for (let start = 0; start < body.length; start += 16385) counter.write(body.slice(start, start + 16385));
      assert.equal(counter.finish(), maxBodyBytes && bytes > maxBodyBytes ? maxBodyBytes + 1 : bytes);
      assert.equal(counter.exceeded, maxBodyBytes !== undefined && maxBodyBytes !== null && bytes > maxBodyBytes);
      if (counter.exceeded) {
        assert.throws(() => checkBodySize(body, 'post:1', 'source', policy), error => {
          assert.equal(error.details.limitBytes, maxBodyBytes);
          assert.equal(error.details.bodyBytes, maxBodyBytes + 1);
          assert.equal(error.details.exact, false); return true;
        });
      } else assert.equal(checkBodySize(body, 'post:1', 'source', policy), bytes);
    }
  }
  assert.equal(checkBodySize('a', 1, 'source', { maxBodyBytes: 1 }), 1);
  assert.throws(() => checkBodySize('😀', 1, 'source', { maxBodyBytes: 1 }), { code: 'CONTENT_BODY_TOO_LARGE' });
});
test('body options reject coercion and reserve an overflow sentinel', () => {
  for (const value of [0, -1, 1.5, NaN, Infinity, '1048576', true, {}, [], Number.MAX_SAFE_INTEGER]) {
    assert.throws(() => normalizeBodyPolicy({ maxBodyBytes: value }), TypeError);
  }
  assert.deepEqual(normalizeBodyPolicy(), { maxBodyBytes: null });
  assert.deepEqual(normalizeBodyPolicy({ maxBodyBytes: Number.MAX_SAFE_INTEGER - 1 }), { maxBodyBytes: Number.MAX_SAFE_INTEGER - 1 });
});
