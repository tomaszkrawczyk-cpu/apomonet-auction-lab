import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const ui=fs.readFileSync('collection-catalog-evidence-ui.js','utf8');
const app=fs.readFileSync('app.js','utf8');

test('collection cards use catalog evidence status instead of raw rarity alone',()=>{
  assert.match(ui,/supported-by-stage2-variant-evidence/);
  assert.match(ui,/Kopicki potwierdzony/);
  assert.match(ui,/Kandydat Kopicki/);
  assert.match(ui,/Rzadkość ogólna/);
});

test('candidate rarity is explicitly marked uncertain',()=>{
  assert.match(ui,/candidateRarity/);
  assert.match(ui,/\$\{t\('candidate'\)\}: \$\{candidateRarity\}\?/);
});

test('collection catalog evidence UI is wired into runtime',()=>{
  assert.match(app,/collection-catalog-evidence-ui\.js/);
});

test('collection evidence observer only watches direct collection rerenders',()=>{
  assert.match(ui,/observe\(root,\{childList:true\}\)/);
  assert.doesNotMatch(ui,/subtree:true/);
});
