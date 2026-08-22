import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const src=fs.readFileSync('xlsx-sheet.js','utf8');

test('Excel exports confirmed Kopicki separately from candidate',()=>{
  assert.match(src,/Kopicki potwierdzony/);
  assert.match(src,/Kandydat Kopicki/);
  assert.match(src,/Status katalogowy/);
});

test('confirmed Kopicki requires Stage 2 evidence status',()=>{
  assert.match(src,/supported-by-stage2-variant-evidence/);
  assert.match(src,/confirmedRef=confirmed\?/);
});

test('unconfirmed catalog data is downgraded to candidate fields',()=>{
  assert.match(src,/candidateRef=!confirmed\?/);
  assert.match(src,/Kandydat — wymaga potwierdzenia/);
});
