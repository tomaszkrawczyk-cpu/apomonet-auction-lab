import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read=p=>fs.readFileSync(p,'utf8');

test('retaking one side invalidates stale analysis images in saved session',()=>{
  const source=read('analysis-album-save-fix.js');
  assert.match(source,/apomonetAnalysisSession/);
  assert.match(source,/delete next\.analysisImgs/);
  assert.match(source,/retakenSide/);
  assert.match(source,/obverseImage/);
  assert.match(source,/reverseImage/);
  assert.match(source,/albumPhotoPrep/);
});

test('market reanalysis identity includes the accepted variant',()=>{
  const market=read('market-reanalysis-refresh.js');
  const resolution=read('correction-reanalysis-resolution.js');
  assert.match(market,/\['nominal','ruler','year','mint','metal','variant'\]/);
  assert.match(resolution,/\['nominal','ruler','year','mint','metal','variant'\]/);
  assert.match(market,/auctionMarketIdentityKey:identityKey/);
  assert.match(market,/correctionReanalysisIdentityKey:identityKey/);
});

test('a later accepted identity change invalidates previously resolved market data even when returning toward raw AI',()=>{
  const source=read('resolved-identity-drift-guard.js');
  const sandbox={console,document:{readyState:'loading'},addEventListener(){}};sandbox.window=sandbox;
  vm.runInNewContext(source,sandbox,{filename:'resolved-identity-drift-guard.js'});
  const base={userAccepted:true,nominal:'dukat',ruler:'Stefan Batory',year:'1586',mint:'Nagybánya',metal:'złoto',variant:'A',correctionReanalysisIdentityKey:'dukat|stefan batory|1586|nagybanya|złoto|a',marketReanalysisCompletedAt:'2026-08-22T12:00:00Z',marketMedian:10000,kopickiReference:'K. 1'};
  assert.equal(sandbox.ApoResolvedIdentityDrift.drifted(base),false);
  const changed={...base,mint:'Wilno'};
  assert.equal(sandbox.ApoResolvedIdentityDrift.drifted(changed),true);
  const out=sandbox.ApoResolvedIdentityDrift.invalidate(changed);
  assert.equal(out.needsReanalysis,true);
  assert.equal(out.derivedDataStale,true);
  assert.equal(out.marketMedian,undefined);
  assert.equal(out.kopickiReference,undefined);
});

test('runtime loads identity drift guard after reanalysis resolution',()=>{
  const app=read('app.js');
  assert.ok(app.indexOf('correction-reanalysis-resolution.js')<app.indexOf('resolved-identity-drift-guard.js'));
});
