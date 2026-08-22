import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const edit=fs.readFileSync('coin-edit-record-integrity.js','utf8');
const purchase=fs.readFileSync('target-purchase-flow.js','utf8');
test('purchase flow and edit use purchaseCurrency as the canonical purchase currency',()=>{
  assert.match(purchase,/purchaseCurrency/);
  assert.match(edit,/fresh\.purchaseCurrency\|\|fresh\.currency/);
  assert.match(edit,/patch\.purchaseCurrency=purchaseCurrency/);
});
test('legacy currency remains fallback compatibility and does not replace canonical purchase currency on load',()=>{
  assert.match(edit,/fresh\.purchaseCurrency\|\|fresh\.currency/);
  assert.match(edit,/saved\.purchaseCurrency\|\|saved\.currency/);
});
