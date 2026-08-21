import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const context=readFileSync(new URL('../auction-context-navigation.js',import.meta.url),'utf8');
const album=readFileSync(new URL('../user-album-auction-context.js',import.meta.url),'utf8');
const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');

test('auction query includes accepted coin identity fields',()=>{
  assert.match(context,/coin\?\.ruler,coin\?\.nominal,coin\?\.year,coin\?\.mint,coin\?\.variant/);
});

test('user album auction action uses the exact stored coin id',()=>{
  assert.match(album,/ApoMonet\.getCoin\(id\)/);
  assert.match(album,/ApoAuctionContext\.archiveUrl\(coin\)/);
});

test('archive restores both coin id and query and triggers search',()=>{
  assert.match(context,/params\.get\('coin'\)/);
  assert.match(context,/params\.get\('q'\)/);
  assert.match(context,/btn\.click\(\)/);
});

test('runtime loads user album auction context after core auction context',()=>{
  const coreIndex=app.indexOf('auction-context-navigation.js');
  const albumIndex=app.indexOf('user-album-auction-context.js');
  assert.ok(coreIndex>=0&&albumIndex>coreIndex);
});
