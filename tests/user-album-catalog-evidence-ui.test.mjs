import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const ui=fs.readFileSync('user-album-catalog-evidence-ui.js','utf8');
const app=fs.readFileSync('app.js','utf8');

test('user album catalog evidence module is wired into runtime',()=>{
  assert.match(app,/user-album-catalog-evidence-ui\.js/);
});

test('user albums distinguish confirmed Kopicki from candidate and general rarity',()=>{
  assert.match(ui,/supported-by-stage2-variant-evidence/);
  assert.match(ui,/Kopicki potwierdzony/);
  assert.match(ui,/Kandydat Kopicki/);
  assert.match(ui,/Rzadkość ogólna/);
});

test('unconfirmed catalog evidence is visibly marked uncertain',()=>{
  assert.match(ui,/candidateRef/);
  assert.match(ui,/candidateRarity/);
  assert.match(ui,/join\(' • '\)\}\?`/);
});

test('album evidence observer only watches list replacements and avoids recursive refresh',()=>{
  assert.match(ui,/observe\(root,\{childList:true\}\)/);
  assert.doesNotMatch(ui,/subtree:true/);
  assert.match(ui,/if\(row\.textContent!==text\)row\.textContent=text/);
});
