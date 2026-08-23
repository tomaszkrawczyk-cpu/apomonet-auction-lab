import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=p=>fs.readFileSync(p,'utf8');

test('collection valuation prefers fresh market median and rejects stale records',()=>{
  const source=read('collection-valuation-source.js');
  assert.match(source,/derivedDataStale\|\|coin\.needsReanalysis\|\|coin\.valuationSuppressedBecauseStale/);
  assert.ok(source.indexOf('coin.marketMedian')<source.indexOf('coin.estimatedValue'));
  assert.match(source,/\(low\+high\)\/2/);
});

test('home dashboard uses the same fresh valuation ordering',()=>{
  const source=read('home-dashboard-summary.js');
  assert.match(source,/ApoCollectionValuation/);
  assert.match(source,/ApoCollectionValuation\?\.value\?\.\(record\)/);
});

test('retaking a photo invalidates prepared cut album images',()=>{
  const source=read('analysis-album-save-fix.js');
  assert.match(source,/albumPhotoMode==='cut'/);
  assert.match(source,/albumPhotoMode:'original'/);
  assert.match(source,/albumObverseImage:null/);
  assert.match(source,/albumReverseImage:null/);
  assert.match(source,/albumPhotoInvalidatedByRetake:true/);
});

test('identity invalidation clears old completed reanalysis markers',()=>{
  const source=read('derived-analysis-invalidation.js');
  for(const token of ['auctionMarketIdentityKey','correctionReanalysisIdentityKey','marketReanalysisCompletedAt'])assert.ok(source.includes(`"${token}"`),token);
  const drift=read('resolved-identity-drift-guard.js');
  for(const token of ['auctionMarketIdentityKey','correctionReanalysisIdentityKey','marketReanalysisCompletedAt'])assert.ok(drift.includes(`'${token}'`),token);
});
