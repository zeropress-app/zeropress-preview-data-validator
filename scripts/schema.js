import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

import { buildPreviewDataSchema } from '../src/contract-definitions.js';

const schemaUrl = new URL('../schemas/preview-data.v0.7.schema.json', import.meta.url);
const expected = buildPreviewDataSchema();
const expectedSource = `${formatJson(expected)}\n`;

if (process.argv.includes('--write')) {
  await fs.writeFile(schemaUrl, expectedSource, 'utf8');
  console.log('Wrote schemas/preview-data.v0.7.schema.json');
  process.exit(0);
}

const actualSource = await fs.readFile(schemaUrl, 'utf8');
const actual = JSON.parse(actualSource);

try {
  assert.deepStrictEqual(actual, expected);
  assert.equal(actualSource, expectedSource);
} catch (error) {
  console.error('schemas/preview-data.v0.7.schema.json does not match the runtime contract definitions or canonical formatting');
  console.error(error.message);
  process.exitCode = 1;
}

function formatJson(value, depth = 0) {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    const compact = formatCompact(value);
    if (value.every((entry) => entry === null || typeof entry !== 'object') && lineFits(compact, depth, 120)) {
      return compact;
    }

    const indentation = '  '.repeat(depth);
    const childIndentation = '  '.repeat(depth + 1);
    const entries = value.map((entry) => {
      const compactEntry = formatCompact(entry);
      if (entry && typeof entry === 'object' && lineFits(compactEntry, depth + 1, 80)) {
        return `${childIndentation}${compactEntry}`;
      }
      return `${childIndentation}${formatJson(entry, depth + 1)}`;
    });
    return `[\n${entries.join(',\n')}\n${indentation}]`;
  }

  const entries = Object.entries(value);
  if (entries.length === 0) return '{}';

  const indentation = '  '.repeat(depth);
  const childIndentation = '  '.repeat(depth + 1);
  const lines = entries.map(([key, entry]) => {
    const keyPrefix = `${childIndentation}${JSON.stringify(key)}: `;
    if (entry === null || typeof entry !== 'object') {
      return `${keyPrefix}${JSON.stringify(entry)}`;
    }

    const compactEntry = formatCompact(entry);
    const preferCompact = (
      (Array.isArray(entry) && entry.every((item) => item === null || typeof item !== 'object'))
      || ['properties', 'required', 'then', 'not'].includes(key)
    );
    if (preferCompact && keyPrefix.length + compactEntry.length <= 120) {
      return `${keyPrefix}${compactEntry}`;
    }
    return `${keyPrefix}${formatJson(entry, depth + 1)}`;
  });
  return `{\n${lines.join(',\n')}\n${indentation}}`;
}

function formatCompact(value) {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((entry) => formatCompact(entry)).join(', ')}]`;
  }
  const entries = Object.entries(value);
  if (entries.length === 0) return '{}';
  return `{ ${entries.map(([key, entry]) => `${JSON.stringify(key)}: ${formatCompact(entry)}`).join(', ')} }`;
}

function lineFits(value, depth, maximum) {
  return (depth * 2) + value.length <= maximum && !value.includes('\\n');
}
