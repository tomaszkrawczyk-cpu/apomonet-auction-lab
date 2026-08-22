import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
const view=readFileSync(new URL('../auction-record-cost-view.js',import.meta.url),'utf8');
test('buyer cost is calculated only from real hammer price',()=>{
  assert.match(view,/const hammer=Number\(record\.hammerPrice\|\|0\)/);
  assert.match(view,/hammer&&window\.ApoAuctionCost\?\.calculateForHouse/);
});
test('auction result keeps its original price basis',()=>{
  assert.match(view,/const resultBasis=window\.ApoArchive\?\.priceBasis\?\.\(record\)\|\|'unknown'/);
  assert.match(view,/resultBasis==='realized'\?record\.realizedPrice/);
  assert.match(view,/resultBasis==='total'\?record\.totalPrice/);
});
test('missing verified fee rule yields incomplete buyer cost instead of guessing',()=>{
  assert.match(view,/buyerCost:cost\.complete\?/);
  assert.match(view,/complete:false,total:null/);
});
