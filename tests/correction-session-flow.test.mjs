import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const correction=readFileSync(new URL('../correction-consistency.js',import.meta.url),'utf8');
const edit=readFileSync(new URL('../coin-edit.html',import.meta.url),'utf8');

test('coin edit loads correction consistency guard',()=>{
  assert.match(edit,/script src="app\.js"/);
  assert.match(app,/correction-consistency\.js/);
});

test('correction sync preserves full analysis session state',()=>{
  assert.match(correction,/\.\.\.old/);
  assert.match(correction,/imgs:\s*Array\.isArray\(old\.imgs\)/);
  assert.match(correction,/analysisImgs:\s*Array\.isArray\(old\.analysisImgs\)/);
  assert.match(correction,/photoDiagnostics:\s*Array\.isArray\(old\.photoDiagnostics\)/);
  assert.match(correction,/Math\.max\(Number\(old\.version\)\s*\|\|\s*0,\s*5\)/);
});

test('every correction submit re-synchronizes the analysis session',()=>{
  assert.match(correction,/form\.addEventListener\("submit"/);
  assert.match(correction,/syncAnalysisSession\(coin\)/);
  assert.match(correction,/#backResult,#chooseAlbum,#openCard/);
});
