import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const src=fs.readFileSync('export-privacy-core.js','utf8');
test('purchase-price export uses canonical purchaseCurrency',()=>{
  assert.match(src,/f\.push\('purchasePrice','purchaseCurrency'\)/);
  assert.doesNotMatch(src,/f\.push\('purchasePrice','currency'\)/);
});
test('legacy currency is only a fallback when canonical purchaseCurrency is absent',()=>{
  assert.match(src,/c\.purchaseCurrency\|\|c\.currency\|\|'PLN'/);
});
