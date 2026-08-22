import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const src=fs.readFileSync('market-reanalysis-refresh.js','utf8');
test('market reanalysis does not force PLN',()=>{
  assert.doesNotMatch(src,/valuation\(coin,10,'PLN'\)/);
  assert.match(src,/settings\?\.currency/);
  assert.match(src,/marketCurrency\|\|coin\?\.valuationCurrency/);
});
test('refreshed market record persists resolved currency consistently',()=>{
  assert.match(src,/marketCurrency:resolvedCurrency/);
  assert.match(src,/valuationCurrency:resolvedCurrency/);
  assert.match(src,/currency:resolvedCurrency/);
});
