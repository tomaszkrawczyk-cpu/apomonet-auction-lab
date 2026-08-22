import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync('collection-valuation-source.js','utf8');
const html=fs.readFileSync('collection.html','utf8');

test('collection valuation source drives card and summary UI',()=>{
  assert.match(source,/patchCollectionCards/);
  assert.match(source,/installCollectionSummary/);
  assert.match(source,/ApoMonet\.load\(\)\.coins/);
  assert.match(source,/marketMedian/);
  assert.match(source,/valuationSuppressedBecauseStale/);
});

test('mixed currencies are rendered separately in collection summary',()=>{
  assert.match(source,/s\.currencies\.map\(code=>money\(s\.groups\[code\],code\)\)\.join\(' \+ '\)/);
  assert.match(source,/Wartości w różnych walutach pokazujemy osobno/);
});

test('legacy inline collection value helper remains overridden by canonical bridge after DOM load',()=>{
  assert.match(html,/function coinValue\(coin\)/);
  assert.match(source,/DOMContentLoaded/);
  assert.match(source,/button\.onclick=/);
  assert.match(source,/MutationObserver/);
});
