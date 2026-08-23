import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
const core=readFileSync(new URL('../auction-archive-core.js',import.meta.url),'utf8');
test('valuation keeps auction price bases separate',()=>{
  assert.match(core,/function priceBasis\(r\)/);
  assert.match(core,/return'hammer'/);
  assert.match(core,/return'realized'/);
  assert.match(core,/return'total'/);
});
test('valuation requires at least three records on one price basis',()=>{
  assert.match(core,/matching\.length>=minCount/);
  assert.match(core,/function dominantBasis\(rows,minCount=3\)/);
  assert.match(core,/insufficient-price-basis/);
});
test('market value reads only the selected price basis',()=>{
  assert.match(core,/if\(basis==='hammer'\)return num\(r\.hammerPrice\)/);
  assert.match(core,/if\(basis==='realized'\)return num\(r\.realizedPrice\)/);
  assert.match(core,/if\(basis==='total'\)return num\(r\.totalPrice\)/);
});
