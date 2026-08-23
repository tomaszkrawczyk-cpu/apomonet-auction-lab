import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const filter=fs.readFileSync('collection-extra-filters.js','utf8');
const sentinel=fs.readFileSync('canonical-record-sentinels.js','utf8');

test('collection filters reuse the shared canonical unknown helper',()=>{
  assert.match(filter,/ApoCanonicalRecordSentinels/);
  assert.match(filter,/sentinels\(\)\.canonical/);
});

test('legacy multilingual unknown values collapse to one canonical value',()=>{
  const state={coins:[]};
  const sandbox={console,ApoMonet:{upsertCoin:coin=>coin,load:()=>state,save(){}},window:null};sandbox.window=sandbox;
  vm.runInNewContext(sentinel,sandbox,{filename:'canonical-record-sentinels.js'});
  for(const value of ['unknown','unbekannt','inconnu','do potwierdzenia'])assert.equal(sandbox.ApoCanonicalRecordSentinels.canonical(value),'Nie ustalono');
});

test('unknown option keeps canonical value but localizes only its visible label',()=>{
  assert.match(filter,/v==='Nie ustalono'\?t\('unknown'\):v/);
  assert.match(filter,/en:\{[^}]*unknown:'Not determined'/);
  assert.match(filter,/de:\{[^}]*unknown:'Nicht bestimmt'/);
  assert.match(filter,/fr:\{[^}]*unknown:'Non déterminé'/);
});
