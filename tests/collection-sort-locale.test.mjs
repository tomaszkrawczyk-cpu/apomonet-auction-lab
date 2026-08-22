import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const source=fs.readFileSync('collection-sort.js','utf8');
test('collection text sorting follows active UI locale rather than fixed Polish locale',()=>{
  assert.match(source,/ApoLanguageRegistry/);
  assert.match(source,/de-DE/);
  assert.match(source,/fr-FR/);
  assert.match(source,/en-GB/);
  assert.match(source,/pl-PL/);
  assert.match(source,/new Intl\.Collator\(locale\(\)/);
  assert.match(source,/toLocaleLowerCase\(locale\(\)\)/);
  assert.doesNotMatch(source,/const collator = new Intl\.Collator\("pl-PL"/);
});
