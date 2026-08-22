import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');

test('dashboard never silently merges different currencies',()=>{
  const source=read('home-dashboard-summary.js');
  assert.match(source,/ApoCollectionValuation\?\.summary/);
  assert.match(source,/Wartości w różnych walutach pokazujemy osobno/);
  assert.match(source,/summary\.currencies\.map/);
});

test('collection value dialog uses currency-aware summary',()=>{
  const source=read('collection-stale-valuation-guard.js');
  assert.match(source,/ApoCollectionValuation\.summary/);
  assert.match(source,/Różne waluty pokazujemy osobno/);
});

test('XLSX exports valuation currency explicitly',()=>{
  const source=read('xlsx-sheet.js');
  assert.match(source,/Waluta wyceny/);
  assert.match(source,/Valuation currency/);
  assert.match(source,/marketCurrency=stale\?'':String\(c\.marketCurrency\|\|c\.valuationCurrency\|\|'PLN'\)/);
});
