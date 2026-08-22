import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const canonical=readFileSync(new URL('../coin-card-canonical-fields.js',import.meta.url),'utf8');
const finish=readFileSync(new URL('../coin-card-finish.js',import.meta.url),'utf8');
const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');

test('saved coin summary exposes only fresh confirmed catalog data in top facts',()=>{
  assert.match(canonical,/supported-by-stage2-variant-evidence/);
  assert.match(canonical,/verified-curated/);
  assert.match(canonical,/kopickiReference/);
  assert.match(canonical,/kopickiRarity/);
  assert.doesNotMatch(canonical,/coin\.catalog/);
});

test('unconfirmed catalog candidate is shown separately in detailed card',()=>{
  assert.match(finish,/detail\.catalogCandidate\|\|\{\}/);
  assert.match(finish,/Kandydat Kopicki — wymaga potwierdzenia/);
  assert.match(finish,/unconfirmedCatalog/);
});

test('duplicate legacy Stage 2 summary renderer stays out of runtime',()=>{
  assert.doesNotMatch(app,/coin-stage2-summary-fix\.js/);
  assert.match(app,/coin-card-canonical-fields\.js/);
  assert.match(app,/coin-card-finish\.js/);
});
