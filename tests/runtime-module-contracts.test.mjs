import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const app=fs.readFileSync('app.js','utf8');

test('safe record, album and edit protections are active',()=>{
  for(const name of ['coin-edit-record-integrity.js','coin-edit-consistency-i18n.js','coin-edit-i18n.js','user-album-photo-pair.js','user-album-actions-i18n.js']) assert.ok(app.includes(name),name);
});

test('legacy all-in-one pretester hotfix stays out of runtime',()=>{
  assert.ok(!app.includes('pretester-stability-fix.js'));
  assert.ok(!app.includes('analysis-canonical-sentinels.js'));
});

test('canonical record sentinels remain the storage source of truth',()=>{
  assert.ok(app.includes('canonical-record-sentinels.js'));
});
