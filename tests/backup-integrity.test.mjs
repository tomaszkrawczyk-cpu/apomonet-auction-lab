import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const backup=fs.readFileSync('backup-integrity.js','utf8');
const html=fs.readFileSync('backup.html','utf8');

test('backup runtime uses the integrity module instead of inline legacy restore',()=>{
  assert.match(html,/backup-integrity\.js/);
  assert.doesNotMatch(html,/for\(const \[k,v\] of Object\.entries\(x\.items\)\)/);
});

test('backup includes newer learning and auction-cost layers',()=>{
  for(const key of ['apomonetCommunityEvidenceV1','apomonet_auction_fee_rules_v1','apomonetCoinFingerprintsV1','apomonetHardNegativesV1','apomonetMultiSourceKnowledgeV1'])assert.ok(backup.includes(key),key);
});

test('restore validates JSON-bearing sections and core APOMONET state before writing',()=>{
  assert.match(backup,/JSON_KEYS/);
  assert.match(backup,/JSON\.parse\(v\)/);
  assert.match(backup,/validateCoreState/);
  for(const key of ['coins','albums','watchlist','events','history'])assert.ok(backup.includes(`'${key}'`),key);
  assert.match(backup,/apomonet_state_v2/);
});

test('restore rolls back partial writes',()=>{
  assert.match(backup,/snapshot\(keys\)/);
  assert.match(backup,/rollback\(before\)/);
});

test('backup version 6 accepts supported older backups',()=>{
  assert.match(backup,/version:6/);
  assert.match(backup,/\[1,2,3,4,5,6\]\.includes/);
});

test('demo album moves and analysis recovery cache are transient, not portable backup data',()=>{
  assert.match(backup,/const TRANSIENT=/);
  for(const key of ['apomonet_demo_album_moves_v1','apomonetAnalysisResilienceV1'])assert.ok(backup.includes(key),key);
  assert.match(backup,/durableItems/);
  assert.match(backup,/!TRANSIENT\.includes\(k\)/);
  assert.match(backup,/for\(const key of TRANSIENT\)localStorage\.removeItem\(key\)/);
});
