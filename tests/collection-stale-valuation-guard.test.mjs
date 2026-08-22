import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const guard=fs.readFileSync('collection-stale-valuation-guard.js','utf8');
const app=fs.readFileSync('app.js','utf8');

test('collection runtime loads stale valuation guard',()=>{
  assert.match(app,/collection-stale-valuation-guard\.js/);
});

test('stale derived records are excluded from collection valuation fields',()=>{
  assert.match(guard,/derivedDataStale/);
  assert.match(guard,/needsReanalysis/);
  assert.match(guard,/valuationSuppressedBecauseStale:true/);
  for(const field of ['value','estimatedValue','estimate','valuation','priceEstimate','marketValue','marketMedian','estimateLow','estimateHigh','estimatedPrice','priceRange']){
    assert.match(guard,new RegExp(`['\"]${field}['\"]`));
  }
});

test('guard changes only collection view data and does not erase persisted history',()=>{
  assert.match(guard,/location\.pathname\.endsWith\('collection\.html'\)/);
  assert.doesNotMatch(guard,/ApoMonet\.save/);
  assert.doesNotMatch(guard,/localStorage\.setItem/);
});
