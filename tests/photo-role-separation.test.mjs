import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const card=fs.readFileSync('coin-photo-side-integrity.js','utf8');
const album=fs.readFileSync('user-album-photo-pair.js','utf8');
const exportView=fs.readFileSync('export-record-view.js','utf8');
const prep=fs.readFileSync('album-photo-prep.js','utf8');

test('coin card uses original saved photos rather than album cutouts',()=>{
  assert.match(card,/coin\.obverseImage\|\|coin\.image\|\|coin\.img/);
  assert.match(card,/coin\.reverseImage/);
  assert.doesNotMatch(card,/albumObverseImage|albumReverseImage/);
});

test('album and export may use accepted cutouts while originals remain canonical',()=>{
  assert.match(album,/albumPhotoMode==='cut'/);
  assert.match(album,/albumObverseImage/);
  assert.match(exportView,/albumPhotoMode==='cut'/);
  assert.match(exportView,/albumObverseImage/);
  assert.match(prep,/Oryginały pozostaną bez zmian/);
  assert.match(prep,/tylko do albumu i eksportu/);
});
