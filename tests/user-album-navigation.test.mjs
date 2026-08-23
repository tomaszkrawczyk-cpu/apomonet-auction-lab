import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const navigation=readFileSync(new URL('../user-album-card-navigation.js',import.meta.url),'utf8');
const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const album=readFileSync(new URL('../user-album.html',import.meta.url),'utf8');

test('real user album opens the real coin card with the same record id',()=>{
  assert.match(navigation,/coin\.html\?id='/);
  assert.match(navigation,/encodeURIComponent\(id\)/);
  assert.doesNotMatch(navigation,/demo-coin\.html/);
});

test('album card exposes a dedicated action opening the exact saved coin',()=>{
  assert.match(navigation,/apo-open-coin-card/);
  assert.match(navigation,/open\.href='coin\.html\?id='\+encodeURIComponent\(id\)/);
  assert.match(navigation,/open\.textContent=label\(\)/);
});

test('navigation module is loaded by the app runtime',()=>{
  assert.match(app,/user-album-card-navigation\.js/);
});

test('album movement keeps using the existing record id',()=>{
  assert.match(album,/ApoMonet\.moveCoinBetweenAlbums\(s\.dataset\.id,albumId,s\.value\)/);
});
