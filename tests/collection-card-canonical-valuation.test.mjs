import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const guard=fs.readFileSync('collection-stale-valuation-guard.js','utf8');
const source=fs.readFileSync('collection-valuation-source.js','utf8');
test('collection card guard uses canonical valuation value and currency',()=>{
  assert.match(guard,/ApoCollectionValuation\.value\(coin\)/);
  assert.match(guard,/ApoCollectionValuation\.currency\?\.\(coin\)/);
  assert.match(guard,/money\(value,currency\)/);
});
test('collection card guard removes stale or missing value labels',()=>{
  assert.match(guard,/if\(!value\)\{if\(node\)node\.remove\(\);return\}/);
  assert.match(source,/derivedDataStale\|\|coin\.needsReanalysis\|\|coin\.valuationSuppressedBecauseStale/);
});
test('collection card observer is scheduled and does not blindly rewrite forever',()=>{
  assert.match(guard,/let scheduled=false/);
  assert.match(guard,/queueMicrotask/);
  assert.match(guard,/if\(node\.textContent!==text\)node\.textContent=text/);
});
