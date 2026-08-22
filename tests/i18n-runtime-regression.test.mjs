import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read=p=>fs.readFileSync(p,'utf8');
const scripts=['analysis-content-i18n.js','analysis-api-error-i18n.js','analysis-progress-i18n.js','analysis-value-canonicalization.js','analysis-image-pipeline.js'];

test('new analysis i18n runtime layers remain valid JavaScript',()=>{
  for(const file of scripts)assert.doesNotThrow(()=>new vm.Script(read(file)),file);
});

test('app loads canonicalization before pretester logic and progress localization after it',()=>{
  const app=read('app.js');
  const canonical=app.indexOf('analysis-value-canonicalization.js');
  const pretester=app.indexOf('pretester-stability-fix.js');
  const progress=app.indexOf('analysis-progress-i18n.js');
  assert.ok(canonical>=0,'canonicalization layer must be loaded');
  assert.ok(pretester>canonical,'pretester must see canonical values');
  assert.ok(progress>pretester,'dynamic progress translator must run after pretester UI');
});

test('analysis translation includes uncertainty reasons but excludes photos and owner notes',()=>{
  const source=read('analysis-content-i18n.js');
  assert.match(source,/uncertaintyReasons/);
  assert.doesNotMatch(source,/obverseImage|reverseImage|userAdditionalInfo|provenance/);
});

test('multilingual unknown sentinels cover current supported languages',()=>{
  const source=read('analysis-value-canonicalization.js');
  for(const value of ['nie ustalono','not determined','nicht bestimmt','non déterminé','unknown','unbekannt','à confirmer'])assert.ok(source.toLowerCase().includes(value),value);
});

test('progress layer covers recommendation confidence retry and both stages',()=>{
  const source=read('analysis-progress-i18n.js');
  for(const token of ['recommended','confidence','basicTimeout','detailTimeout','stage1','stage2'])assert.ok(source.includes(token),token);
});
