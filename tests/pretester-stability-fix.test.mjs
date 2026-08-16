import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync('pretester-stability-fix.js','utf8');

test('pretester hardening script is valid JavaScript',()=>{
  assert.doesNotThrow(()=>new vm.Script(source));
});

test('curated Kopicki mapping requires diagnostic variant evidence',()=>{
  assert.match(source,/Kopicki 8339/);
  assert.match(source,/rarity:'R5'/);
  assert.match(source,/Kopicki 8337/);
  assert.match(source,/rarity:'R4'/);
  assert.match(source,/HD\\s\*\[-–\]\?\\s\*L/);
  assert.match(source,/return null;/);
});

test('analysis recovery persists a job and resumes after visibility or network return',()=>{
  assert.match(source,/apomonet_pending_analysis_v1/);
  assert.match(source,/visibilitychange/);
  assert.match(source,/addEventListener\('online'/);
  assert.match(source,/X-Apo-Job-Id/);
  assert.doesNotMatch(source,/AbortController/);
});

test('late i18n covers previously untranslated tester actions',()=>{
  for(const label of ['Edytuj i popraw','Analizuj inną monetę','Usuń monetę z kolekcji','Profil domu aukcyjnego']){
    assert.ok(source.includes(label),`missing translation key: ${label}`);
  }
});

test('app loads the pretester hardening after other runtime modules',()=>{
  const app=fs.readFileSync('app.js','utf8');
  assert.match(app,/pretester-stability-fix\.js/);
  assert.ok(app.lastIndexOf('pretester-stability-fix.js')>app.lastIndexOf('auction-house-live.js'));
});
