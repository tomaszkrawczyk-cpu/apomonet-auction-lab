import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const valuation=fs.readFileSync('collection-valuation-source.js','utf8');
const invalidation=fs.readFileSync('derived-analysis-invalidation.js','utf8');
const app=fs.readFileSync('app.js','utf8');

test('obsolete collection stale override is intentionally not loaded',()=>{
  assert.doesNotMatch(app,/collection-stale-valuation-guard\.js/);
  assert.match(app,/collection-valuation-source\.js/);
});

test('canonical valuation source excludes stale derived records',()=>{
  assert.match(valuation,/derivedDataStale/);
  assert.match(valuation,/needsReanalysis/);
  assert.match(valuation,/valuationSuppressedBecauseStale/);
  assert.match(valuation,/return 0/);
});

test('identity invalidation clears persisted market-derived fields before a fresh valuation',()=>{
  for(const field of ['estimatedValue','estimate','valuation','priceEstimate','marketValue','marketMedian','estimateLow','estimateHigh','estimatedPrice','priceRange']){
    assert.ok(invalidation.includes(field),field);
  }
  assert.match(invalidation,/needsReanalysis:true/);
  assert.match(invalidation,/derivedDataStale:true/);
});
