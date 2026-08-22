import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const guard=fs.readFileSync('album-photo-side-integrity.js','utf8');
const app=fs.readFileSync('app.js','utf8');

test('album photo side guard loads after photo preparation',()=>{
  const prep=app.indexOf('album-photo-prep.js');
  const integrity=app.indexOf('album-photo-side-integrity.js');
  assert.ok(prep>=0&&integrity>prep);
});

test('missing cutout falls back only to the original from the same side',()=>{
  assert.match(guard,/isObverse\?clean\(coin\.obverseImage\|\|coin\.image\|\|coin\.img\):clean\(coin\.reverseImage\)/);
  assert.doesNotMatch(guard,/albumObverseImage\s*\|\|\s*coin\.albumReverseImage/);
  assert.doesNotMatch(guard,/albumReverseImage\s*\|\|\s*coin\.albumObverseImage/);
  assert.doesNotMatch(guard,/reverseImage\s*\|\|\s*coin\.obverseImage/);
  assert.doesNotMatch(guard,/obverseImage\s*\|\|\s*coin\.reverseImage/);
});

test('album and user-album use the hardened canonical resolver',()=>{
  const pair=fs.readFileSync('user-album-photo-pair.js','utf8');
  assert.match(pair,/ApoAlbumPhotos\?\.resolve/);
  assert.match(guard,/window\.ApoAlbumPhotos=Object\.freeze/);
});
