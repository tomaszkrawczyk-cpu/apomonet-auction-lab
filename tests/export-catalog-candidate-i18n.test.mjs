import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const src=fs.readFileSync('export-i18n.js','utf8');

test('PDF literature labels include confirmed and candidate Kopicki fields in stable order',()=>{
  assert.match(src,/const lit=\['kopickiConfirmed','rarityConfirmed','kopickiCandidate','tyszkiewicz','tyszValue','parchimowicz'\]/);
});

test('catalog candidate note is localized in all supported languages',()=>{
  for(const token of ['Kandydat katalogowy','Catalog candidate','Katalogkandidat','Candidat de catalogue'])assert.ok(src.includes(token),token);
});

test('candidate note keeps explicit confirmation requirement',()=>{
  assert.match(src,/Wymaga potwierdzenia cechami wariantu/);
  assert.match(src,/Requires confirmation by variety evidence/);
});
