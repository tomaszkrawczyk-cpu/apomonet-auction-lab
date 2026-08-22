import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const code=fs.readFileSync('canonical-record-sentinels.js','utf8');
const app=fs.readFileSync('app.js','utf8');

test('runtime loads canonical record normalization immediately after app core',()=>{
  const core=app.indexOf('app-core.js');
  const sentinel=app.indexOf('canonical-record-sentinels.js');
  assert.ok(core>=0&&sentinel>core);
});

test('common multilingual unknown markers collapse to one canonical value',()=>{
  for(const token of ['unknown','unbekannt','inconnu','do\\s+potwierdzenia','not\\s+determined'])assert.match(code,new RegExp(token));
  assert.match(code,/\?\s*'Nie ustalono'\s*:/);
});

test('normalization happens at upsert boundary and migrates existing coins',()=>{
  assert.match(code,/ApoMonet\.upsertCoin=coin=>oldUpsert\(normalizeCoin\(coin\)\)/);
  assert.match(code,/const coins=\(state\.coins\|\|\[\]\)\.map/);
  assert.match(code,/if\(changed\)\{state\.coins=coins;ApoMonet\.save\(state\)\}/);
});

test('only identity-style fields are canonicalized, not descriptions or catalog references',()=>{
  assert.match(code,/TOP_FIELDS=\['country','ruler','year','nominal','mint','metal','variant'\]/);
  assert.doesNotMatch(code,/fullDescription.*canonical/);
  assert.doesNotMatch(code,/kopickiReference.*canonical/);
});
