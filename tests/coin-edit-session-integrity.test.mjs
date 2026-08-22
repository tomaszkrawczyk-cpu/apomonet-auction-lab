import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app=fs.readFileSync('app.js','utf8');
const edit=fs.readFileSync('coin-edit-record-integrity.js','utf8');

test('coin edit integrity guard is loaded by runtime',()=>{
  assert.match(app,/coin-edit-record-integrity\.js/);
});

test('coin edit session preservation keeps both photo arrays and diagnostics',()=>{
  for(const token of ['old.imgs','old.analysisImgs','old.photoDiagnostics','fresh.obverseImage','fresh.reverseImage'])assert.ok(edit.includes(token),token);
  assert.match(edit,/version:Math\.max\(Number\(old\.version\)\|\|0,5\)/);
});

test('coin edit guard blocks writes for a missing query record',()=>{
  assert.match(edit,/queryId&&!ApoMonet\.getCoin\(queryId\)/);
  assert.match(edit,/event\.stopImmediatePropagation\(\)/);
});
