import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const enrich=readFileSync(new URL('../catalog-candidate-enrichment.js',import.meta.url),'utf8');
const gate=readFileSync(new URL('../derived-analysis-invalidation.js',import.meta.url),'utf8');
const card=readFileSync(new URL('../coin-card-finish.js',import.meta.url),'utf8');

test('runtime loads focused catalog enrichment',()=>{
  assert.match(app,/catalog-candidate-enrichment\.js/);
  assert.match(enrich,/\/api\/health/);
  assert.match(enrich,/mode:'catalog-candidate'/);
});

test('focused catalog pass persists only an unconfirmed candidate onto the current Stage 2 identity',()=>{
  assert.match(enrich,/const normalizedCandidate=\{reference,rarity:/);
  assert.match(enrich,/persistCandidate\(normalizedCandidate\)/);
  assert.match(enrich,/detailReanalysisIdentityKey!==identityKey/);
  assert.match(enrich,/catalogEvidenceStatus:detail\.catalogEvidenceStatus==='supported-by-stage2-variant-evidence'\?detail\.catalogEvidenceStatus:'unconfirmed'/);
});

test('identity correction invalidates old candidates while Stage 2 gate keeps candidate separate from confirmed Kopicki',()=>{
  assert.match(gate,/"catalogCandidate"/);
  assert.match(gate,/output\.catalogCandidate=\{reference:/);
  assert.match(gate,/output\.kopickiReference=""/);
  assert.match(gate,/output\.catalogEvidenceStatus="unconfirmed"/);
});

test('coin card visibly surfaces an unconfirmed catalog candidate',()=>{
  assert.match(card,/detail\.catalogCandidate\|\|\{\}/);
  assert.match(card,/Kandydat Kopicki — wymaga potwierdzenia/);
});
