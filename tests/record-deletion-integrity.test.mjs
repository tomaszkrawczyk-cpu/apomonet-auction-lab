import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const src=fs.readFileSync('record-deletion-integrity.js','utf8');
const app=fs.readFileSync('app.js','utf8');

test('record deletion integrity loads immediately after app core',()=>{
  const core=app.indexOf('app-core.js'),guard=app.indexOf('record-deletion-integrity.js');
  assert.ok(core>=0&&guard>core);
});

test('deleting the active coin clears only its resume and follow-up context',()=>{
  assert.match(src,/session\?\.id===id/);
  for(const key of ['apomonetAnalysisSession','apomonetReturnToAnalysis','apomonetOpenAlbumAfterResume','apomonetAlbumPhotoPrep','apomonetOwnerAnswers'])assert.ok(src.includes(key),key);
});

test('deleted coin is removed from export selection and linked watchlist entries',()=>{
  assert.match(src,/apomonet_export_ids/);
  assert.match(src,/apomonet_demo_export_coins/);
  assert.match(src,/coinId/);
  assert.match(src,/cleanupLinkedWatchlist/);
});

test('shared fingerprint and learning stores are deliberately not erased by record deletion',()=>{
  assert.doesNotMatch(src,/apomonetCoinFingerprintsV1/);
  assert.doesNotMatch(src,/apomonetHardNegativesV1/);
});
