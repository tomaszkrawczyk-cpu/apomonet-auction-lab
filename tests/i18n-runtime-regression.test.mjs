import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read=p=>fs.readFileSync(p,'utf8');
const scripts=['analysis-content-i18n.js','analysis-api-error-i18n.js','analysis-progress-i18n.js','canonical-record-sentinels.js','analysis-image-pipeline.js','coin-edit-record-integrity.js'];

test('current analysis i18n and canonical runtime layers remain valid JavaScript',()=>{
  for(const file of scripts)assert.doesNotThrow(()=>new vm.Script(read(file)),file);
});

test('app loads canonical record normalization before analysis and edit integrity layers',()=>{
  const app=read('app.js');
  const canonical=app.indexOf('canonical-record-sentinels.js');
  const progress=app.indexOf('analysis-progress-i18n.js');
  const edit=app.indexOf('coin-edit-record-integrity.js');
  assert.ok(canonical>=0,'canonical record sentinel layer must be loaded');
  assert.ok(progress>canonical,'progress localization must run after canonical record normalization is available');
  assert.ok(edit>canonical,'edit integrity must run after canonical record normalization is available');
  assert.ok(!app.includes('pretester-stability-fix.js'),'legacy hardcoded pretester hotfix must stay out of runtime');
  assert.ok(!app.includes('analysis-canonical-sentinels.js'),'legacy fetch-level sentinel wrapper must stay out of runtime');
});

test('analysis translation includes uncertainty reasons but excludes photos and owner notes',()=>{
  const source=read('analysis-content-i18n.js');
  assert.match(source,/uncertaintyReasons/);
  assert.doesNotMatch(source,/obverseImage|reverseImage|userAdditionalInfo|provenance/);
});

test('canonical record sentinels cover all supported-language unknown values without fetch interception',()=>{
  const source=read('canonical-record-sentinels.js');
  for(const value of ['nie\\s+ustalono','not\\s+determined','nicht\\s+bestimmt','non\\s+determinee','unknown','unbekannt','a\\s+confirmer'])assert.ok(source.includes(value),value);
  assert.doesNotMatch(source,/window\.fetch\s*=/);
  assert.match(source,/ApoMonet\.upsertCoin=coin=>oldUpsert\(normalizeCoin\(coin\)\)/);
});

test('progress layer covers recommendation confidence retry and both stages',()=>{
  const source=read('analysis-progress-i18n.js');
  for(const token of ['recommended','confidence','basicTimeout','detailTimeout','stage1','stage2'])assert.ok(source.includes(token),token);
});

test('coin edit integrity permits explicit clearing and blocks phantom ids',()=>{
  const source=read('coin-edit-record-integrity.js');
  assert.match(source,/patch\[key\]=String\(el\.value/);
  assert.match(source,/queryId&&!ApoMonet\.getCoin\(queryId\)/);
  assert.match(source,/stopImmediatePropagation/);
});
