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

test('catalog candidate remains distinct from confirmed Kopicki',()=>{
  assert.match(enrich,/catalogCandidate:\{reference,rarity,confidence:/);
  assert.match(gate,/const output = \{ \.\.\.detail \}/);
  assert.doesNotMatch(gate,/delete output\.catalogCandidate/);
});

test('coin card visibly surfaces an unconfirmed catalog candidate',()=>{
  assert.match(card,/detail\.catalogCandidate\|\|\{\}/);
  assert.match(card,/Kandydat Kopicki — wymaga potwierdzenia/);
});
