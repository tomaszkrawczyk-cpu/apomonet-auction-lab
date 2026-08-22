import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
const src=readFileSync(new URL('../auction-source-freshness.js',import.meta.url),'utf8');
test('freshness distinguishes recent, aging and stale verification',()=>{
  assert.match(src,/days<=30/);
  assert.match(src,/days<=180/);
  assert.match(src,/level:'fresh'/);
  assert.match(src,/level:'aging'/);
  assert.match(src,/level:'stale'/);
});
test('sale date is not used as source verification date',()=>{
  assert.match(src,/r\.verifiedAt\|\|r\.observedAt\|\|r\.updatedAt/);
  assert.doesNotMatch(src,/soldAt\|\|/);
});
