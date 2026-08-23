import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
const policy=readFileSync(new URL('../auction-outlier-policy.js',import.meta.url),'utf8');
const hook=readFileSync(new URL('../auction-outlier-valuation-hook.js',import.meta.url),'utf8');
test('outlier policy uses conservative IQR filtering',()=>{
  assert.match(policy,/1\.5\*iqr/);
  assert.match(policy,/usable\.length<4/);
  assert.match(policy,/kept\.length<2/);
});
test('outliers remain recorded but are excluded from valuation rows',()=>{
  assert.match(policy,/outliers/);
  assert.match(policy,/pozostają widoczne jako fakty aukcyjne/);
  assert.match(hook,/rows=filtered\.rows\|\|\[\],outliers=filtered\.outliers\|\|\[\]/);
  assert.match(hook,/valuationRecords:rows/);
});
test('valuation hook wraps archive valuationRows rather than deleting records',()=>{
  assert.match(hook,/const baseValuation=ApoArchive\.valuation\.bind\(ApoArchive\)/);
  assert.match(hook,/ApoArchive\.valuation=function/);
  assert.doesNotMatch(hook,/remove\(/);
});
