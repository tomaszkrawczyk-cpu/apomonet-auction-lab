import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const src=fs.readFileSync('stage2-literature-request.js','utf8');

test('Kopicki confirmation requires variant, confidence and diagnostic evidence',()=>{
  assert.match(src,/meaningful\(reference\)&&meaningful\(variant\)&&confidence>=80&&\(diagnostics\.length>=2\|\|fingerprintStrong>=3\)/);
});

test('unconfirmed catalog candidates are not added to confirmed literature',()=>{
  assert.match(src,/d\.catalogEvidenceStatus='unconfirmed'/);
  assert.match(src,/if\(d\.catalogEvidenceStatus==='supported-by-stage2-variant-evidence'\)add\('kopicki'/);
});

test('Kopicki rarity accepts only canonical R scale values',()=>{
  assert.match(src,/\^\(\?:R\|R\[1-8\]\)\$/);
  assert.match(src,/d\.kopickiRarity=''/);
});

test('strong fingerprint features must be observable, meaningful and at least 70 confidence',()=>{
  assert.match(src,/f\.method!=='not_observable'/);
  assert.match(src,/meaningful\(f\.value\)/);
  assert.match(src,/Number\(f\.confidence\)>=70/);
});
