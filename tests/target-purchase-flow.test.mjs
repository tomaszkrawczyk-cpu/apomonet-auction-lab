import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const flow=readFileSync(new URL('../target-purchase-flow.js',import.meta.url),'utf8');
const ui=readFileSync(new URL('../archive-alert-ui.js',import.meta.url),'utf8');
const card=readFileSync(new URL('../coin-card-finish.js',import.meta.url),'utf8');
const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');

test('purchase flow operates on the existing coin id',()=>{
  assert.match(flow,/function completePurchase\(coinId,lot=\{\}\)/);
  assert.match(flow,/find\(c=>c\.id===coinId\)/);
  assert.match(flow,/moveCoinBetweenAlbums\(coinId,fromId,collection\.id\)/);
  assert.match(flow,/assignCoinToAlbum\(coinId,collection\.id\)/);
  assert.match(flow,/const patch=\{id:coinId,purchaseStatus:'purchased'/);
  assert.doesNotMatch(flow,/uid\('coin'\)/);
});

test('goal and dream assignments are removed when purchase completes',()=>{
  assert.match(flow,/a\.id==='goals'/);
  assert.match(flow,/a\.id==='dreams'/);
  assert.match(flow,/a\.kind==='targets'/);
  assert.match(flow,/a\.kind==='dreams'/);
});

test('purchase metadata uses the same provenance fields rendered by the coin card',()=>{
  for(const field of ['purchasedAt','purchaseSource','purchaseSourceUrl','purchasePrice','purchaseCurrency'])assert.match(flow,new RegExp(field));
  assert.match(flow,/purchaseUrl:purchaseSourceUrl/);
  assert.match(card,/current\.purchaseSourceUrl/);
  assert.match(card,/current\.purchasePrice/);
  assert.match(card,/current\.purchaseCurrency/);
  assert.match(flow,/ApoMonet\.upsertCoin\(patch\)/);
});

test('purchase retires both modern coinId targets and legacy id-only watchlist targets',()=>{
  assert.match(flow,/retireWatchlistTarget/);
  assert.match(flow,/x\?\.coinId/);
  assert.match(flow,/String\(x\?\.id\|\|''\)===sid/);
});

test('archive alert exposes explicit purchase action only for saved goals and dreams',()=>{
  assert.match(ui,/Purchased — move to collection|Kupiona — przenieś do kolekcji/);
  assert.match(ui,/\['goals-album','dreams-album'\]\.includes\(m\.targetSource\)/);
  assert.match(ui,/ApoTargetPurchase\.completePurchase\(m\.coinId,m\.lot\|\|\{\}\)/);
});

test('runtime loads purchase flow before archive alert UI',()=>{
  assert.ok(app.indexOf('target-purchase-flow.js')>=0);
  assert.ok(app.indexOf('target-purchase-flow.js')<app.indexOf('archive-alert-ui.js'));
});
