/** Operational publishing policy; deliberately separate from schema validation. */
export const BODY_WARNING_BYTES = 256 * 1024;

/** Product default: no body ceiling. Other format/resource guards still apply. */
export function normalizeBodyPolicy({ maxBodyBytes } = {}) {
  if (maxBodyBytes == null) return { maxBodyBytes: null };
  if (!Number.isSafeInteger(maxBodyBytes) || maxBodyBytes <= 0 || maxBodyBytes >= Number.MAX_SAFE_INTEGER) {
    throw new TypeError('maxBodyBytes must be a positive safe integer below Number.MAX_SAFE_INTEGER, or null');
  }
  return { maxBodyBytes };
}
export const BODY_WARNING_EXAMPLES = 20;

/** Bounded UTF-8 counting, including surrogate pairs split across chunks. */
export class BodyByteCounter {
  constructor(policy) {
    this.limit = normalizeBodyPolicy(policy).maxBodyBytes ?? Infinity;
    this.bytes = 0;
    this.high = false;
  }
  get exceeded() { return this.bytes > this.limit; }
  write(text) {
    for (let i = 0; i < text.length && this.bytes <= this.limit; i++) {
      const code = text.charCodeAt(i);
      if (this.high) {
        this.high = false;
        if (code >= 0xdc00 && code <= 0xdfff) { this.bytes += 4; continue; }
        this.bytes += 3;
      }
      if (code >= 0xd800 && code <= 0xdbff) this.high = true;
      else this.bytes += code < 0x80 ? 1 : code < 0x800 ? 2 : 3;
    }
    this.bytes = Math.min(this.bytes, this.limit + 1);
    return this.bytes;
  }
  finish() {
    if (this.high) { this.high = false; this.bytes = Math.min(this.bytes + 3, this.limit + 1); }
    return this.bytes;
  }
}

export function safeBodyIdentifier(value) {
  return String(value).replace(/[\u0000-\u001f\u007f-\u009f]/g, '?').slice(0, 120);
}

export class ContentBodySizeError extends Error {
  constructor(id, bytes, representation = 'content', limitBytes) {
    const identifier = safeBodyIdentifier(id);
    super(`CONTENT_BODY_TOO_LARGE: ${identifier} exceeds the ${limitBytes}-byte UTF-8 body limit (${representation}). Split or shorten its body, then try again.`);
    this.name = 'ContentBodySizeError';
    this.code = 'CONTENT_BODY_TOO_LARGE';
    this.details = { id: identifier, bodyBytes: bytes, limitBytes, representation, exact: false };
  }
}

export function checkBodySize(content, id, representation = 'content', policy) {
  if (typeof content !== 'string') throw new TypeError('Expected a string body');
  const counter = new BodyByteCounter(policy);
  counter.write(content);
  return assertBodyBytes(counter.finish(), id, representation, policy);
}

export function assertBodyBytes(bytes, id, representation = 'content', policy) {
  const { maxBodyBytes } = normalizeBodyPolicy(policy);
  if (maxBodyBytes !== null && bytes > maxBodyBytes) throw new ContentBodySizeError(id, bytes, representation, maxBodyBytes);
  return bytes;
}

/** Call add once per document, with the largest source/transformed size. */
export function createBodyWarningCollector() {
  let count = 0, maxBodyBytes = 0;
  const affected = [];
  return {
    add(id, bytes) {
      if (bytes < BODY_WARNING_BYTES) return;
      count++;
      maxBodyBytes = Math.max(maxBodyBytes, bytes);
      if (affected.length < BODY_WARNING_EXAMPLES) affected.push(safeBodyIdentifier(id));
    },
    warnings() {
      return count ? [{
        code: 'CONTENT_BODY_LARGE', count, affected: [...affected], maxBodyBytes,
        omittedExamples: count - affected.length,
        message: `${count} document(s) have a body of 256 KiB or more (largest ${maxBodyBytes} UTF-8 bytes). Consider splitting them into smaller posts for faster reading and publishing.`,
      }] : [];
    },
  };
}
