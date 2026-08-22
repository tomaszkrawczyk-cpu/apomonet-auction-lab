import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const src=fs.readFileSync('stage2-literature-persist.js','utf8');

test('specialist literature persistence uses canonical unknown helper',()=>{
  assert.match(src,/ApoCanonicalRecordSentinels\?\.isUnknown/);
});

test('unknown sentinels cannot persist as Kopicki reference or rarity',()=>{
  assert.match(src,/known\(detail\.kopickiReference\)/);
  assert.match(src,/known\(detail\.kopickiRarity\)/);
});

test('unknown sentinels cannot persist as Tyszkiewicz or Parchimowicz values',()=>{
  assert.match(src,/known\(tys\.value\)/);
  assert.match(src,/known\(tys\.historicalValue\)/);
  assert.match(src,/par&&known\(par\.value\)/);
});
