import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const pair=fs.readFileSync('user-album-photo-pair.js','utf8');
const app=fs.readFileSync('app.js','utf8');
test('user album pair is active and uses canonical album resolver',()=>{
  assert.match(app,/user-album-photo-pair\.js/);
  assert.match(app,/user-album-actions-i18n\.js/);
  assert.match(pair,/ApoAlbumPhotos\?\.resolve/);
  assert.match(pair,/source\(c,'obverse'\)/);
  assert.match(pair,/source\(c,'reverse'\)/);
});
test('fallback never mirrors one missing side into the other',()=>{
  assert.match(pair,/side==='obverse'\?\(c\?\.obverseImage\|\|''\):\(c\?\.reverseImage\|\|''\)/);
  assert.doesNotMatch(pair,/obverseImage\|\|c\?\.reverseImage/);
  assert.doesNotMatch(pair,/reverseImage\|\|c\?\.obverseImage/);
});
