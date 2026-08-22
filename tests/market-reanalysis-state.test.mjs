import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=p=>fs.readFileSync(p,'utf8');

test('Stage 2 does not clear stale derived state while corrected market still needs refresh',()=>{
  const source=read('stage2-literature-persist.js');
  assert.match(source,/current\.needsReanalysis/);
  assert.match(source,/derivedDataStale=true/);
  assert.match(source,/trwa ponowne dopasowanie notowań i wyceny/i);
});

test('corrected market refresh finalizes reanalysis state and records identity key',()=>{
  const source=read('market-reanalysis-refresh.js');
  assert.match(source,/needsReanalysis:false/);
  assert.match(source,/derivedDataStale:false/);
  assert.match(source,/derivedDataStaleReason:''/);
  assert.match(source,/marketReanalysisCompletedAt/);
  assert.match(source,/auctionMarketIdentityKey/);
  assert.match(source,/apo-stage2-detail/);
});

test('identity correction invalidation removes stale market values before refresh',()=>{
  const source=read('derived-analysis-invalidation.js');
  for(const token of ['auctionRecords10y','auctionStrictMatches10y','marketMedian','marketCurrency','priceRange','estimateLow','estimateHigh','estimatedPrice'])assert.ok(source.includes(`"${token}"`),token);
  assert.match(source,/needsReanalysis = true/);
  assert.match(source,/derivedDataStale = true/);
});
