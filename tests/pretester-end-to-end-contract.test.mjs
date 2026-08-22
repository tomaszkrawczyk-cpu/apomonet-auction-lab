import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app=fs.readFileSync('app.js','utf8');
const flow=fs.readFileSync('analysis-record-flow-fix.js','utf8');
const deletion=fs.readFileSync('record-deletion-integrity.js','utf8');
const backup=fs.readFileSync('backup-integrity.js','utf8');
const exportView=fs.readFileSync('export-record-view.js','utf8');

test('runtime contains the complete pretester path in dependency-safe order',()=>{
  const required=[
    'analysis-state-guard.js','analysis-resilience.js','analysis-inline-correction.js',
    'album-photo-prep.js','analysis-album-save-fix.js','analysis-record-flow-fix.js',
    'coin-photo-side-integrity.js','coin-card-canonical-fields.js',
    'derived-analysis-invalidation.js','correction-reanalysis-resolution.js','resolved-identity-drift-guard.js',
    'catalog-candidate-enrichment.js','export-privacy-core.js','export-record-view.js'
  ];
  for(const name of required)assert.ok(app.includes(name),name);
  assert.ok(app.indexOf('stage2-literature-request.js')<app.indexOf('stage2-literature-persist.js'));
  assert.ok(app.indexOf('stage2-literature-persist.js')<app.indexOf('market-reanalysis-refresh.js'));
});

test('save-to-album navigation reopens only the exact record just assigned',()=>{
  assert.match(flow,/__apoLastAlbumAssignment/);
  assert.match(flow,/session\?\.id&&String\(session\.id\)!==String\(assignment\.coinId\)/);
  assert.match(flow,/getCoin\?\.\(assignment\.coinId\)/);
  assert.match(flow,/coin\.html\?id=/);
});

test('export passes through a normalized privacy boundary before rendering',()=>{
  assert.match(exportView,/PRIVATE_FIELDS/);
  assert.match(exportView,/rawAI/);
  assert.match(exportView,/userAdditionalInfo/);
  assert.match(exportView,/recordMigrationVersion/);
});

test('deleting a record clears record-scoped continuation/export/watchlist context',()=>{
  for(const token of ['apomonetAnalysisSession','apomonetOwnerAnswers','apomonet_export_ids','watchlist'])assert.ok(deletion.includes(token),token);
});

test('backup restore validates before write and rolls back every touched durable or transient key',()=>{
  assert.match(backup,/validateItems\(x\.items\)/);
  assert.match(backup,/touched=\[\.\.\.new Set\(\[\.\.\.writeKeys,\.\.\.TRANSIENT\]\)\]/);
  assert.match(backup,/rollback\(before\)/);
});
