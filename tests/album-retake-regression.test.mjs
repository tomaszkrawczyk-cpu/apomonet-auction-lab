import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('retake hotfix is loaded on every analysis page',()=>{
  const app=read('app.js');
  assert.match(app,/analysis-album-save-fix\.js/);
});

test('failed background removal offers retake without discarding analysis',()=>{
  const fix=read('analysis-album-save-fix.js');
  assert.match(fix,/Wynik analizy zostaje zachowany/);
  assert.match(fix,/Zrób nowe zdjęcie awersu/);
  assert.match(fix,/Zrób nowe zdjęcie rewersu/);
  assert.match(fix,/document\.getElementById\(inputId\)\?\.click\(\)/);
  assert.match(fix,/photo-prep-status/);
  assert.match(fix,/MutationObserver/);
});

test('album preparation is rebound to the coin currently being saved',()=>{
  const fix=read('analysis-album-save-fix.js');
  assert.match(fix,/ApoMonet\.assignCoinToAlbum=function\(coinId,albumId\)/);
  assert.match(fix,/syncPendingCoinId\(coinId\)/);
  assert.match(fix,/ApoMonet\.getCoin\(coinId\)/);
  assert.match(fix,/obverseImage:obverse\|\|null/);
  assert.match(fix,/reverseImage:reverse\|\|null/);
  assert.match(fix,/previous\.call\(ApoMonet,coinId,albumId\)/);
  assert.match(fix,/return ApoMonet\.getCoin\(coinId\)\|\|result/);
});
