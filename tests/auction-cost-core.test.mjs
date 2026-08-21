import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

function helper(initial=[]){
  let stored=JSON.stringify(initial);
  const sandbox={console,localStorage:{getItem(){return stored},setItem(_k,v){stored=v}}};
  sandbox.window=sandbox;
  vm.runInNewContext(read('auction-cost-core.js'),sandbox,{filename:'auction-cost-core.js'});
  return sandbox.ApoAuctionCost;
}

test('verified house rule calculates hammer, premium and VAT separately',()=>{
  const cost=helper();
  const rule=cost.upsertRule({auctionHouse:'Dom Testowy',sourceUrl:'https://example.com/fees',checkedAt:'2026-08-21',validFrom:'2026-01-01',buyerPremiumPct:20,premiumVatPct:23,fixedFee:0,currency:'PLN'});
  const result=cost.calculateForHouse({auctionHouse:'Dom Testowy',saleDate:'2026-08-21',hammer:1000,currency:'PLN'});
  assert.equal(result.complete,true);
  assert.equal(result.buyerPremium,200);
  assert.equal(result.premiumVat,46);
  assert.equal(result.total,1246);
  assert.equal(result.ruleId,rule.id);
  assert.equal(result.ruleSourceUrl,'https://example.com/fees');
});

test('missing verified rule returns partial result instead of guessing a premium',()=>{
  const cost=helper();
  const result=cost.calculateForHouse({auctionHouse:'Nieznany Dom',hammer:1000});
  assert.equal(result.complete,false);
  assert.equal(result.total,null);
  assert.match(result.note,/nie zgaduje stawki/i);
});

test('legacy raw calculator remains available for manual scenarios',()=>{
  const cost=helper();
  const result=cost.calculate({hammer:1000,buyerPremiumPct:10,premiumVatPct:20});
  assert.equal(result.total,1120);
});

test('runtime loads the auction cost engine',()=>{
  assert.match(read('app.js'),/auction-cost-core\.js/);
});
