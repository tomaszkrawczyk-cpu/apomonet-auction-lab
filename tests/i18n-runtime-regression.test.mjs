import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read=p=>fs.readFileSync(p,'utf8');
const scripts=['analysis-content-i18n.js','analysis-api-error-i18n.js','analysis-progress-i18n.js','analysis-canonical-sentinels.js','analysis-image-pipeline.js','coin-edit-record-integrity.js'];

test('new analysis i18n runtime layers remain valid JavaScript',()=>{
  for(const file of scripts)assert.doesNotThrow(()=>new vm.Script(read(file)),file);
});

test('app loads canonicalization before progress localization and record integrity layer for editing',()=>{
  const app=read('app.js');
  const canonical=app.indexOf('analysis-canonical-sentinels.js');
  const pretester=app.indexOf('pretester-stability-fix.js');
  const progress=app.indexOf('analysis-progress-i18n.js');
  assert.ok(canonical>=0,'canonicalization layer must be loaded');
  assert.ok(canonical>pretester,'canonical sentinel layer must wrap responses before progress recommendation reads them');
  assert.ok(progress>canonical,'dynamic progress translator must run after canonicalization');
  assert.match(app,/coin-edit-record-integrity\.js/);
});

test('analysis translation includes uncertainty reasons but excludes photos and owner notes',()=>{
  const source=read('analysis-content-i18n.js');
  assert.match(source,/uncertaintyReasons/);
  assert.doesNotMatch(source,/obverseImage|reverseImage|userAdditionalInfo|provenance/);
});

test('multilingual unknown sentinels cover current supported languages',()=>{
  const source=read('analysis-canonical-sentinels.js');
  for(const value of ['nie ustalono','not determined','nicht bestimmt','non déterminé','unknown','unbekannt','à confirmer'])assert.ok(source.toLowerCase().includes(value),value);
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
