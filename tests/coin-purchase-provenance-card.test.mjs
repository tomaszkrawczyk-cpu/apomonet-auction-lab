import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
const card=readFileSync(new URL('../coin-card-finish.js',import.meta.url),'utf8');
test('purchased coin card shows provenance without changing identity',()=>{
  assert.match(card,/current\.purchaseStatus==='purchased'/);
  assert.match(card,/Dom aukcyjny \/ źródło/);
  assert.match(card,/Data zakupu/);
  assert.match(card,/Cena zakupu/);
  assert.match(card,/current\.purchaseSourceUrl/);
  assert.match(card,/Otwórz oryginalne źródło/);
});
