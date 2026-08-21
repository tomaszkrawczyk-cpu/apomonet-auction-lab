import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const core=readFileSync(new URL('../app-core.js',import.meta.url),'utf8');
const album=readFileSync(new URL('../user-album.html',import.meta.url),'utf8');

test('moving a coin edits albumIds on the existing coin record',()=>{
  assert.match(core,/function moveCoinBetweenAlbums\(coinId,fromAlbumId,toAlbumId\)/);
  assert.match(core,/s\.coins\.findIndex\(x=>x\.id===coinId\)/);
  assert.match(core,/s\.coins\[i\]=\{\.\.\.s\.coins\[i\],albumIds:ids,updatedAt:/);
  assert.doesNotMatch(core,/function moveCoinBetweenAlbums[\s\S]{0,500}uid\('coin'\)/);
});

test('moving removes the source album and adds destination without duplicates',()=>{
  assert.match(core,/ids=ids\.filter\(x=>x!==fromAlbumId\)/);
  assert.match(core,/toAlbumId&&!ids\.includes\(toAlbumId\)/);
  assert.match(core,/ids\.push\(toAlbumId\)/);
});

test('user album invokes move with the same selected coin id',()=>{
  assert.match(album,/ApoMonet\.moveCoinBetweenAlbums\(s\.dataset\.id,albumId,s\.value\)/);
});
