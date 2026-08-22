import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const market=fs.readFileSync('market-reanalysis-refresh.js','utf8');
const resolution=fs.readFileSync('correction-reanalysis-resolution.js','utf8');
const app=fs.readFileSync('app.js','utf8');

test('market refresh stores correction identity completion key',()=>{
  assert.match(market,/correctionReanalysisIdentityKey/);
  assert.match(market,/auctionMarketIdentityKey/);
  assert.match(market,/marketReanalysisCompletedAt/);
  assert.match(market,/detailReanalysisCompletedAt/);
  assert.match(market,/detailReanalysisIdentityKey!==identityKey/);
  assert.match(market,/needsReanalysis:false/);
});

test('resolved corrected identity requires matching Stage 2 and matching market identity',()=>{
  assert.match(resolution,/detailReanalysisCompletedAt/);
  assert.match(resolution,/detailReanalysisIdentityKey===current/);
  assert.match(resolution,/marketReanalysisCompletedAt/);
  assert.match(resolution,/auctionMarketIdentityKey===current/);
  assert.match(resolution,/marketMatches/);
  assert.match(resolution,/needsReanalysis:false/);
  assert.match(resolution,/derivedDataStale:false/);
  assert.match(resolution,/repairState/);
});

test('resolution guard loads after correction and derived invalidation layers',()=>{
  const correction=app.indexOf('correction-consistency.js');
  const invalidation=app.indexOf('derived-analysis-invalidation.js');
  const resolutionIndex=app.indexOf('correction-reanalysis-resolution.js');
  assert.ok(correction>=0&&invalidation>correction&&resolutionIndex>invalidation);
});
