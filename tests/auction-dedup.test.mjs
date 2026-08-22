import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
const core=readFileSync(new URL('../auction-dedup-core.js',import.meta.url),'utf8');
const policy=readFileSync(new URL('../auction-dedup-policy.js',import.meta.url),'utf8');
const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
test('fingerprint uses sale identity facts and price basis',()=>{
  assert.match(core,/soldAt/);
  assert.match(core,/auctionHouse\|\|r\.sourceLabel\|\|r\.source/);
  assert.match(core,/kopickiReference\|\|r\.catalog/);
  assert.match(core,/basis\(r\)/);
  assert.match(core,/String\(price\(r\)\)/);
});
test('dedupe keeps one best documented record and marks mirrors',()=>{
  assert.match(core,/evidenceQualityScore/);
  assert.match(core,/duplicateSourceCount:group\.length/);
  assert.match(core,/duplicateOf:ranked\[0\]\.id/);
});
test('runtime prevents mirrored records from double counting',()=>{
  assert.match(policy,/ApoArchive\.comparable=function/);
  assert.match(policy,/duplicateRecordCount:d\.removedCount/);
  assert.match(app,/auction-dedup-core\.js/);
  assert.match(app,/auction-dedup-policy\.js/);
});
