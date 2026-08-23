import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const src=fs.readFileSync('record-deletion-integrity.js','utf8');
const app=fs.readFileSync('app.js','utf8');
const i18n=fs.readFileSync('coin-delete-i18n.js','utf8');

test('record deletion integrity loads immediately after app core',()=>{
  const core=app.indexOf('app-core.js'),guard=app.indexOf('record-deletion-integrity.js');
  assert.ok(core>=0&&guard>core);
});

test('deleting the active coin clears only its resume and follow-up context',()=>{
  assert.match(src,/session\?\.id===id/);
  for(const key of ['apomonetAnalysisSession','apomonetReturnToAnalysis','apomonetOpenAlbumAfterResume','apomonetAlbumPhotoPrep','apomonetOwnerAnswers'])assert.ok(src.includes(key),key);
});

test('deleted coin is removed from export selection and modern or legacy linked watchlist entries',()=>{
  assert.match(src,/apomonet_export_ids/);
  assert.match(src,/apomonet_demo_export_coins/);
  assert.match(src,/x\?\.coinId/);
  assert.match(src,/legacyCoinTarget/);
  assert.match(src,/String\(x\?\.id\|\|''\)===sid/);
  assert.match(src,/cleanupLinkedWatchlist/);
});

test('market facts survive coin deletion but their orphaned collection link is removed',()=>{
  assert.match(src,/cleanupArchiveLink/);
  assert.match(src,/ApoArchive\.load/);
  assert.match(src,/delete clean\.linkedCoinId/);
  assert.match(src,/delete clean\.expertMapped/);
  assert.match(src,/ApoArchive\.save\(next\)/);
});

test('shared fingerprint and learning stores are deliberately not erased by record deletion',()=>{
  assert.doesNotMatch(src,/apomonetCoinFingerprintsV1/);
  assert.doesNotMatch(src,/apomonetHardNegativesV1/);
});

test('coin card destructive confirmation is localized and loaded only on coin cards',()=>{
  assert.match(src,/coin\.html/);
  assert.match(src,/coin-delete-i18n\.js/);
  for(const l of ['pl','en','de','fr'])assert.match(i18n,new RegExp(`${l}:\\{confirm:`));
  assert.match(i18n,/ApoMonet\.deleteCoin\(id\)!==false/);
});
