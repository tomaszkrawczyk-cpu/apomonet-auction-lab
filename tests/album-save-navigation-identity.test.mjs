import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync('analysis-record-flow-fix.js','utf8');

test('fresh photo flow clears previous album navigation identity',()=>{
  assert.match(source,/clearLastAssignment\(\)/);
  assert.match(source,/delete window\.__apoLastAlbumCoinId/);
  assert.match(source,/delete window\.__apoLastAlbumAssignment/);
});

test('album navigation only opens a freshly assigned coin matching current analysis session',()=>{
  assert.match(source,/Date\.now\(\)-Number\(assignment\.at\|\|0\)>3000/);
  assert.match(source,/session\?\.id&&String\(session\.id\)!==String\(assignment\.coinId\)/);
  assert.match(source,/String\(saved\.id\)!==String\(assignment\.coinId\)/);
  assert.match(source,/pointerdown/);
});
