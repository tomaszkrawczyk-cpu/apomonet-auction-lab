import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const correction=fs.readFileSync('correction-consistency.js','utf8');
const exportView=fs.readFileSync('export-record-view.js','utf8');
const market=fs.readFileSync('market-reanalysis-refresh.js','utf8');
const persist=fs.readFileSync('stage2-literature-persist.js','utf8');

test('legacy correction consistency respects fully resolved reanalysis',()=>{
  assert.match(correction,/reanalysisResolved/);
  assert.match(correction,/detailReanalysisIdentityKey/);
  assert.match(correction,/correctionReanalysisIdentityKey/);
  assert.match(correction,/marketReanalysisCompletedAt/);
  assert.match(correction,/if\(!reanalysisResolved\(normalized\)\)normalized\.needsReanalysis=true/);
  assert.match(correction,/"variant"/);
});

test('export uses accepted album cutouts without mirroring a missing side',()=>{
  assert.match(exportView,/albumPhotoMode==='cut'/);
  assert.match(exportView,/coin\.albumObverseImage/);
  assert.match(exportView,/coin\.albumReverseImage/);
  assert.match(exportView,/obverseImage:exportPhoto\(coin,'obverse'\)/);
  assert.match(exportView,/reverseImage:exportPhoto\(coin,'reverse'\)/);
  assert.doesNotMatch(exportView,/albumObverseImage\|\|coin\.albumReverseImage/);
  assert.doesNotMatch(exportView,/albumReverseImage\|\|coin\.albumObverseImage/);
});

test('market refresh remains gated by fresh Stage 2 identity marker',()=>{
  assert.match(persist,/detailReanalysisIdentityKey/);
  assert.match(persist,/detailReanalysisCompletedAt/);
  assert.match(market,/coin\.detailReanalysisIdentityKey!==identityKey/);
  assert.match(market,/!coin\.detailReanalysisCompletedAt/);
});

test('legacy export repair targets market valuation semantically, never by a global cell index',()=>{
  assert.match(correction,/\.market-grid > div:first-child/);
  assert.doesNotMatch(correction,/cells\[10\]/);
});
