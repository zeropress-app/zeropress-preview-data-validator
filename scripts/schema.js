import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { format } from 'prettier';
import sortJson from 'prettier-plugin-sort-json';

import { buildPreviewDataSchema } from '../src/contract-definitions.js';

const schemaUrl = new URL('../schemas/preview-data.v0.7.schema.json', import.meta.url);
const expected = buildPreviewDataSchema();
const expectedSource = await format(`${JSON.stringify(expected, null, 2)}\n`, {
  parser: 'json',
  plugins: [sortJson],
  printWidth: 80,
  tabWidth: 2,
  useTabs: false,
  endOfLine: 'lf',
  jsonRecursiveSort: true,
  jsonSortOrder: JSON.stringify({
    $schema: null,
    $id: null,
    $comment: null,
    $ref: null,
    '/^\\$.*/': null,
    '/^[^\\d+]/': 'none',
    '/^\\d+/': 'none',
    if: null,
    then: null,
    else: null,
  }),
});

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
