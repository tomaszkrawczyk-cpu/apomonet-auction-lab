import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const canonical = readFileSync(new URL('../coin-card-canonical-fields.js', import.meta.url), 'utf8');
const detailCard = readFileSync(new URL('../coin-card-finish.js', import.meta.url), 'utf8');

test('unconfirmed catalog candidates do not populate the confirmed rarity field', () => {
  assert.match(canonical, /const confirmedCatalogParts=c=>/);
  assert.match(canonical, /if\(!confirmed\)return\{reference:'',rarity:''\}/);
  assert.match(canonical, /raritySource==='catalog-candidate'/);
  assert.doesNotMatch(canonical, /candidate\.rarity\|\|coin\.rarity/);
});

test('candidate catalog reference remains explicitly marked as a candidate', () => {
  assert.match(detailCard, /detail\.catalogCandidate\|\|\{\}/);
  assert.match(detailCard, /Kandydat Kopicki — wymaga potwierdzenia/);
});
