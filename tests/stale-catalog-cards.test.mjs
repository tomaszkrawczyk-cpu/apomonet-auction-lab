import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const collection=fs.readFileSync('collection-catalog-evidence-ui.js','utf8');
const album=fs.readFileSync('user-album-catalog-evidence-ui.js','utf8');

test('collection card never presents stale catalog evidence as confirmed or candidate',()=>{
  assert.match(collection,/derivedDataStale\|\|coin\?\.needsReanalysis/);
  assert.match(collection,/if\(stale\(coin\)\)return t\('stale'\)/);
  assert.match(collection,/Katalog wymaga ponownej analizy/);
});

test('album card never presents stale catalog evidence as confirmed or candidate',()=>{
  assert.match(album,/derivedDataStale\|\|coin\?\.needsReanalysis/);
  assert.match(album,/if\(stale\(coin\)\)return t\('stale'\)/);
  assert.match(album,/Katalog wymaga ponownej analizy/);
});
