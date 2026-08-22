import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const source=fs.readFileSync('collection-valuation-source.js','utf8');

test('collection cards use canonical valuation value and currency',()=>{
  assert.match(source,/const copyNow=copy\(\),v=value\(coin\),cur=currency\(coin\)/);
  assert.match(source,/money\(v,cur\)/);
  assert.match(source,/copyNow\.estimate/);
});

test('collection card renderer removes stale or missing value labels',()=>{
  assert.match(source,/if\(!v\)\{node\?\.remove\(\);return\}/);
  assert.match(source,/derivedDataStale\|\|coin\.needsReanalysis\|\|coin\.valuationSuppressedBecauseStale/);
});

test('collection card observer only rewrites labels when their text actually changes',()=>{
  assert.match(source,/MutationObserver\(\(\)=>patchCollectionCards\(\)\)/);
  assert.match(source,/if\(node\.textContent!==text\)node\.textContent=text/);
});
