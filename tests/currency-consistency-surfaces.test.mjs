import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');

test('dashboard never silently merges different currencies',()=>{
  const source=read('home-dashboard-summary.js');
  assert.match(source,/ApoCollectionValuation\?\.summary/);
  assert.match(source,/summary\.currencies\.map/);
  assert.match(source,/currencies\.length>1|summary\.currencies\.length>1/);
});

test('collection value dialog uses the same currency-aware canonical summary',()=>{
  const source=read('collection-valuation-source.js');
  assert.match(source,/function summary\(coins\)/);
  assert.match(source,/const c=currency\(coin\)/);
  assert.match(source,/canShowSingleTotal:currencies\.length===1/);
  assert.match(source,/s\.currencies\.length>1/);
});

test('XLSX exports valuation currency explicitly and canonical layer runs before packaging',()=>{
  const sheet=read('xlsx-sheet.js'),canonical=read('xlsx-sheet-canonical.js'),app=read('app.js');
  assert.match(sheet,/Waluta wyceny/);
  assert.match(sheet,/Valuation currency/);
  assert.match(sheet,/marketCurrency=stale\?'':String\(c\.marketCurrency\|\|c\.valuationCurrency\|\|'PLN'\)/);
  assert.match(canonical,/marketMedian/);
  assert.ok(app.indexOf('xlsx-sheet.js')<app.indexOf('xlsx-sheet-canonical.js'));
  assert.ok(app.indexOf('xlsx-sheet-canonical.js')<app.indexOf('xlsx-package.js'));
});
