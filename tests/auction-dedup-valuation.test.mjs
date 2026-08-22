import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=p=>fs.readFileSync(p,'utf8');

test('dedup policy recalculates valuation from unique records before statistics',()=>{
  const source=read('auction-dedup-policy.js');
  assert.match(source,/ApoAuctionDedup\.dedupe\(raw\)/);
  assert.match(source,/ApoArchive\.valuationRows\(records,coin\)/);
  assert.match(source,/count:records\.length/);
  assert.match(source,/duplicateRecordCount/);
  assert.match(source,/unikalnych porównywalnych rekordów/i);
});

test('deduplication happens before source-conflict and outlier valuation wrappers',()=>{
  const app=read('app.js');
  const dedup=app.indexOf('auction-dedup-policy.js');
  const conflict=app.indexOf('auction-source-conflict-policy.js');
  const outlier=app.indexOf('auction-outlier-valuation-hook.js');
  assert.ok(dedup>=0&&conflict>dedup&&outlier>conflict,{dedup,conflict,outlier});
});

test('old behavior that only deduped returned records after base valuation is absent',()=>{
  const source=read('auction-dedup-policy.js');
  assert.doesNotMatch(source,/baseValuation\(coin,years,currency\)/);
  assert.doesNotMatch(source,/return\{\.\.\.v,records:d\.rows/);
});
