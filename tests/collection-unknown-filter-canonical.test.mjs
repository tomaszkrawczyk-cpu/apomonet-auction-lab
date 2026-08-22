import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const filter=fs.readFileSync('collection-extra-filters.js','utf8');
const sentinel=fs.readFileSync('canonical-record-sentinels.js','utf8');

test('collection filters reuse the shared canonical unknown helper',()=>{
  assert.match(filter,/ApoCanonicalRecordSentinels/);
  assert.match(filter,/sentinels\(\)\.canonical/);
});

test('legacy multilingual unknown values collapse to one canonical value',()=>{
  for(const token of ['unknown','unbekannt','inconnu','do\\s+potwierdzenia']) assert.match(sentinel,new RegExp(token,'i'));
  assert.match(sentinel,/\?'Nie ustalono':v/);
});

test('unknown option keeps canonical value but localizes only its visible label',()=>{
  assert.match(filter,/v==='Nie ustalono'\?labelUnknown\(\):v/);
  assert.match(filter,/en'\?'Not determined'/);
  assert.match(filter,/de'\?'Nicht bestimmt'/);
  assert.match(filter,/fr'\?'Non déterminé'/);
});
