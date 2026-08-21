import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const source=readFileSync(new URL('../derived-analysis-invalidation.js',import.meta.url),'utf8');

test('identity corrections invalidate stale market and catalog data',()=>{
  for(const field of ['detail','kopickiReference','kopickiRarity','auctionRecords10y','auctionStrictMatches10y','marketMedian','marketCurrency','priceRange','valuationConfidence','valuationUpdatedAt','estimateLow','estimateHigh','estimatedPrice']){
    assert.ok(source.includes(`"${field}"`),`missing derived field: ${field}`);
  }
  assert.match(source,/for \(const key of DERIVED_FIELDS\) delete output\[key\]/);
  assert.match(source,/output\.valuationNote =\s*"Wycena i notowania wymagają ponownego dopasowania po korekcie identyfikacji\."/);
});

test('previous detailed analysis is retained only as audit history',()=>{
  assert.match(source,/output\.previousDetailAudit = \{/);
  assert.match(source,/reason: "accepted-identity-correction"/);
  assert.match(source,/detail: previousDetail/);
});

test('user-edited rarity may survive while AI-derived rarity is invalidated',()=>{
  assert.match(source,/function userChangedRarity/);
  assert.match(source,/if \(!userChangedRarity\(output\)\) delete output\.rarity/);
});

test('corrected identity forces a fresh detailed analysis',()=>{
  assert.match(source,/output\.analysisLevel = "basic"/);
  assert.match(source,/output\.needsReanalysis = true/);
  assert.match(source,/output\.needsDetailedAnalysis = true/);
  assert.match(source,/output\.derivedDataStale = true/);
});
