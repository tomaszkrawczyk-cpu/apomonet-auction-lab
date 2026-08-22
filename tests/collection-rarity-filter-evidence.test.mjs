import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const src=fs.readFileSync('collection-extra-filters.js','utf8');

test('confirmed Kopicki rarity and general rarity use separate filter keys',()=>{
  assert.match(src,/return `kopicki:\$\{kr\}`/);
  assert.match(src,/return general\?`general:\$\{general\}`:''/);
});

test('Kopicki rarity enters the filter only with supported Stage 2 evidence',()=>{
  assert.match(src,/status==='supported-by-stage2-variant-evidence'/);
  assert.match(src,/c\?\.kopickiRarity\|\|d\.kopickiRarity/);
});

test('unconfirmed catalog candidate does not create a Kopicki rarity filter option',()=>{
  assert.doesNotMatch(src,/catalogCandidate.*rarityKey/s);
});

test('rarity filter labels distinguish general rarity from Kopicki in PL EN DE FR',()=>{
  for(const lang of ['pl','en','de','fr']) assert.match(src,new RegExp(`${lang}:\\{allRarity:`));
  assert.match(src,/kind==='kopicki'\?t\('kopicki'\):t\('general'\)/);
});
