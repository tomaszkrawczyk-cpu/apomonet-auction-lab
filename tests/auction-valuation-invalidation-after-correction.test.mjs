import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
const invalidation=readFileSync(new URL('../derived-analysis-invalidation.js',import.meta.url),'utf8');
test('identity correction clears every persisted auction snapshot field',()=>{
  for(const field of ['auctionRecords10y','auctionRecordCount10y','auctionMarketSnapshot','auctionStrictMatches10y']){
    assert.match(invalidation,new RegExp(`"${field}"`));
  }
});
test('identity correction clears persisted valuation fields and requires recomputation',()=>{
  for(const field of ['marketMedian','marketCurrency','priceRange','valuationConfidence','valuationUpdatedAt','estimateLow','estimateHigh','estimatedPrice']){
    assert.match(invalidation,new RegExp(`"${field}"`));
  }
  assert.match(invalidation,/Wycena i notowania wymagają ponownego dopasowania po korekcie identyfikacji/);
});
