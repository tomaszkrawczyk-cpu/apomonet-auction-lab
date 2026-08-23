import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync('collection-valuation-source.js','utf8');
function api(){const sandbox={window:null};sandbox.window=sandbox;vm.runInNewContext(source,sandbox);return sandbox.ApoCollectionValuation}
test('fresh source-based market median is the canonical collection value',()=>{const a=api();assert.equal(a.value({marketMedian:4200,value:999,estimatedValue:1200,estimateLow:800,estimateHigh:1200}),4200)});
test('legacy and AI estimate fields are never treated as collection market valuation',()=>{const a=api();for(const coin of [{value:999},{estimatedValue:1200},{estimateLow:800,estimateHigh:1200},{valuation:5000}])assert.equal(a.value(coin),0)});
test('stale records never contribute to collection value',()=>{const a=api();assert.equal(a.value({marketMedian:4200,derivedDataStale:true}),0)});
test('mixed currencies are never silently added into one PLN total',()=>{const a=api();const s=a.summary([{marketMedian:1000,marketCurrency:'PLN'},{marketMedian:500,marketCurrency:'EUR'}]);assert.equal(s.canShowSingleTotal,false);assert.equal(s.total,null);assert.equal(s.groups.PLN,1000);assert.equal(s.groups.EUR,500)});
test('one currency may be safely summarized while unsourced estimates remain unvalued',()=>{const a=api();const s=a.summary([{marketMedian:1000,marketCurrency:'PLN'},{estimateLow:800,estimateHigh:1200,valuationCurrency:'PLN'}]);assert.equal(s.canShowSingleTotal,true);assert.equal(s.total,1000);assert.equal(s.currency,'PLN');assert.equal(s.unvaluedCount,1)});
