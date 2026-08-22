import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync('coin-card-finish.js','utf8');

test('coin card warns after accepted identity correction and hides stale Stage 2 detail',()=>{
  assert.match(source,/canonical\.derivedDataStale\|\|canonical\.needsReanalysis/);
  assert.match(source,/apo-stale-banner/);
  assert.match(source,/Dane dodatkowe wymagają ponownej analizy/);
  assert.match(source,/const detail=stale\?null:current\.detail/);
});

test('stale warning is localized for supported UI languages',()=>{
  for(const phrase of ['Additional data require reanalysis','Zusatzdaten müssen neu analysiert werden','Les données supplémentaires nécessitent une nouvelle analyse'])assert.ok(source.includes(phrase),phrase);
});
