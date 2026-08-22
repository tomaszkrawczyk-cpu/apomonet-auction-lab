import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const valuation=fs.readFileSync('collection-valuation-source.js','utf8');
const invalidation=fs.readFileSync('derived-analysis-invalidation.js','utf8');
const app=fs.readFileSync('app.js','utf8');

test('stale records are excluded by the canonical collection valuation source',()=>{
  assert.match(valuation,/coin\.derivedDataStale\|\|coin\.needsReanalysis\|\|coin\.valuationSuppressedBecauseStale/);
  assert.match(valuation,/return 0/);
  assert.match(valuation,/staleCount/);
});

test('identity invalidation removes all legacy market fields used by valuation fallbacks',()=>{
  for(const field of ['estimatedValue','estimate','valuation','priceEstimate','marketValue','marketMedian','estimateLow','estimateHigh','estimatedPrice','priceRange'])assert.ok(invalidation.includes(field),field);
});

test('runtime uses one collection valuation source and keeps obsolete override disabled',()=>{
  assert.ok(app.includes('collection-valuation-source.js'));
  assert.ok(!app.includes('collection-stale-valuation-guard.js'));
  assert.match(valuation,/window\.ApoCollectionValuation=Object\.freeze/);
  assert.match(valuation,/installCollectionSummary/);
  assert.match(valuation,/patchCollectionCards/);
});

test('mixed currencies stay separated instead of being added without conversion',()=>{
  assert.match(valuation,/const currencies=Object\.keys\(groups\)/);
  assert.match(valuation,/canShowSingleTotal:currencies\.length===1/);
  assert.match(valuation,/s\.currencies\.length>1/);
});
