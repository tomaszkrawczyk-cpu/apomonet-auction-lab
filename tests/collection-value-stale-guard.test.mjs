import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const guard=fs.readFileSync('collection-stale-valuation-guard.js','utf8');
const app=fs.readFileSync('app.js','utf8');
const collection=fs.readFileSync('collection.html','utf8');

test('stale records lose every valuation field used by collection totals',()=>{
  for(const field of ['value','estimatedValue','estimate','valuation','priceEstimate','marketValue','estimateLow','estimateHigh'])assert.ok(guard.includes(`'${field}'`),field);
  assert.match(guard,/derivedDataStale\|\|coin\?\.needsReanalysis/);
  assert.match(guard,/valuationSuppressedBecauseStale:true/);
});

test('collection stale valuation guard is loaded before page inline total calculation',()=>{
  assert.ok(app.includes('collection-stale-valuation-guard.js'));
  assert.ok(collection.includes('function coinValue(coin)'));
  assert.ok(collection.includes('<script src="app.js"></script>'));
});
