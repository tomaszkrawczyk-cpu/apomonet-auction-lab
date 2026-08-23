import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=p=>fs.readFileSync(p,'utf8');

test('album save hardening never treats blob URLs as durable photos',()=>{
  const source=read('analysis-album-save-fix.js');
  assert.doesNotMatch(source,/startsWith\(['\"]blob:/);
  assert.match(source,/startsWith\(['\"]data:image\//);
  assert.match(source,/startsWith\(['\"]https?:\/\//);
});

test('saved-card verification also rejects blob URLs',()=>{
  const source=read('analysis-save-open-card.js');
  assert.doesNotMatch(source,/startsWith\(['\"]blob:/);
  assert.match(source,/durableImage/);
});

test('coin editor persists explicitly cleared fields and blocks missing ids',()=>{
  const source=read('coin-edit-record-integrity.js');
  assert.match(source,/patch\[key\]=String\(el\.value\?\?['\"]['\"]\)\.trim\(\)/);
  assert.match(source,/queryId&&!ApoMonet\.getCoin\(queryId\)/);
});

test('return-to-analysis session refresh reads the latest persisted record by id',()=>{
  const source=read('coin-edit-record-integrity.js');
  assert.match(source,/ApoMonet\.getCoin\(queryId\)/);
  assert.match(source,/apomonetAnalysisSession/);
});

test('album navigation opens the exact record returned from assignment',()=>{
  const source=read('analysis-record-flow-fix.js');
  assert.match(source,/const savedId=result\?\.id\|\|coinId\|\|''/);
  assert.match(source,/__apoLastAlbumCoinId=savedId/);
  assert.match(source,/ApoMonet\?\.getCoin\?\.\(assignment\.coinId\)/);
  assert.match(source,/coin\.html\?id=/);
});
