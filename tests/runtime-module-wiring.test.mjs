import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app=fs.readFileSync('app.js','utf8');
const progress=fs.readFileSync('analysis-progress-i18n.js','utf8');

test('dynamic analysis progress translations are wired into runtime',()=>{
  assert.match(app,/analysis-progress-i18n\.js/);
  assert.match(progress,/basicTimeout/);
  assert.match(progress,/detailTimeout/);
  assert.match(progress,/apomonet:language-change/);
});

test('legacy album navigation hotfix is removed while canonical album navigation remains active',()=>{
  assert.equal(fs.existsSync('album-navigation-hotfix.js'),false);
  assert.doesNotMatch(app,/album-navigation-hotfix\.js/);
  assert.match(app,/user-album-card-navigation\.js/);
  assert.match(app,/user-album-auction-context\.js/);
});

test('export runtime helpers remain wired after module-list edits',()=>{
  assert.match(app,/export-record-view\.js/);
  assert.match(app,/export-i18n\.js/);
});
