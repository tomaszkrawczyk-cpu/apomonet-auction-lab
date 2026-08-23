import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const src=fs.readFileSync('export-record-view.js','utf8');

test('export only exposes confirmed Kopicki when Stage 2 evidence status is confirmed',()=>{
  assert.match(src,/supported-by-stage2-variant-evidence/);
  assert.match(src,/const confirmedReference=confirmed\?/);
  assert.match(src,/const confirmedRarity=confirmed\?/);
});

test('unconfirmed catalog data is downgraded to candidate fields for export',()=>{
  assert.match(src,/catalogCandidateReference:candidateReference/);
  assert.match(src,/catalogCandidateRarity:candidateRarity/);
  assert.match(src,/catalogEvidenceStatus:stale\?'stale-after-identity-correction':\(confirmed\?\(status\|\|'confirmed'\):\(status\|\|'unconfirmed'\)\)/);
});
