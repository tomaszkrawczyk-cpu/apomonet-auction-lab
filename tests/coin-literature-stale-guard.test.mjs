import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const src=fs.readFileSync('coin-literature-panel.js','utf8');
test('stale coin literature is hidden after identity correction',()=>{
  assert.match(src,/derivedDataStale\|\|c\?\.needsReanalysis\|\|c\?\.literatureSuppressedBecauseStale/);
  assert.match(src,/if\(stale\(coin\)\)\{box\?\.remove\(\);return\}/);
});
test('literature values are escaped before entering innerHTML',()=>{
  assert.match(src,/const L=.*esc=/s);
  assert.match(src,/esc\(coin\.tyszkiewiczReference\)/);
  assert.match(src,/esc\(r\.label\)/);
  assert.match(src,/esc\(r\.value\)/);
});
