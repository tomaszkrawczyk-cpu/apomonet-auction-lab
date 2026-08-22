import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app=fs.readFileSync('app.js','utf8');
const persist=fs.readFileSync('stage2-literature-persist.js','utf8');
const market=fs.readFileSync('market-reanalysis-refresh.js','utf8');
const retake=fs.readFileSync('analysis-album-save-fix.js','utf8');

test('Stage 2 persistence loads before market refresh',()=>{
  const a=app.indexOf('stage2-literature-persist.js');
  const b=app.indexOf('market-reanalysis-refresh.js');
  assert.ok(a>=0&&b>=0&&a<b,'Stage 2 persistence must register before market refresh');
});

test('Stage 2 writes a fresh identity marker before market can unlock the record',()=>{
  assert.match(persist,/stage2IdentityKey/);
  assert.match(persist,/stage2CompletedAt/);
  assert.match(market,/stage2IdentityKey!==identityKey/);
  assert.match(market,/stage2CompletedAt/);
});

test('retake invalidates prepared cutout images stored by album photo preparation',()=>{
  for(const token of ['albumObverseImage:null','albumReverseImage:null','albumPhotoPrepVersion:null','albumPhotoPreparedAt:null','albumPhotoRemovalConfidence:null'])assert.ok(retake.includes(token),token);
});
