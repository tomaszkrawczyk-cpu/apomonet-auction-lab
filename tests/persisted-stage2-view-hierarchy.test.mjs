import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read=p=>fs.readFileSync(p,'utf8');

test('export view prefers saved accepted fields then persisted Stage 2 detail and never raw AI',()=>{
  const source=read('export-record-view.js');
  assert.doesNotMatch(source,/rawAI/);
  const sandbox={location:{pathname:'/export.html'},ApoMonet:{load(){return{coins:[]}}}};
  sandbox.window=sandbox;
  vm.runInNewContext(source,sandbox,{filename:'export-record-view.js'});
  const normalize=sandbox.ApoExportRecordView.normalize;
  const coin=normalize({variant:'accepted variant',description:'accepted description',detail:{variant:'stage2 variant',kopickiReference:'K. 1',kopickiRarity:'R2',fullDescription:'stage2 description'},rawAI:{variant:'raw variant',fullDescription:'raw description'}});
  assert.equal(coin.variant,'accepted variant');
  assert.equal(coin.fullDescription,'accepted description');
  assert.equal(coin.kopickiReference,'K. 1');
  assert.equal(coin.kopickiRarity,'R2');
});

test('saved coin detail fallback is loaded and excludes raw AI',()=>{
  const app=read('app.js');
  const fallback=read('coin-detail-fallback.js');
  assert.match(app,/coin-detail-fallback\.js/);
  assert.match(fallback,/detail\.fullDescription|detail\?\.fullDescription/);
  assert.doesNotMatch(fallback,/rawAI/);
});

test('PDF and Excel consume normalized persisted detail without a raw AI fallback',()=>{
  const exportActions=read('export-actions-i18n.js');
  const page=read('export.html');
  const sheet=read('xlsx-sheet.js');
  assert.match(exportActions,/export-record-view\.js/);
  assert.doesNotMatch(page,/rawAI/);
  assert.doesNotMatch(sheet,/rawAI/);
  assert.match(sheet,/const d=c\.detail&&typeof c\.detail==='object'\?c\.detail:\{\}/);
  assert.match(sheet,/d\.fullDescription/);
  assert.match(sheet,/d\.kopickiReference/);
  assert.match(sheet,/d\.kopickiRarity/);
});
