import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const alerts=readFileSync(new URL('../auction-alerts-core.js',import.meta.url),'utf8');

test('targets include both goals and dreams albums',()=>{
  assert.match(alerts,/a\?\.id==='goals'/);
  assert.match(alerts,/a\?\.id==='dreams'/);
  assert.match(alerts,/a\?\.kind==='targets'/);
  assert.match(alerts,/a\?\.kind==='dreams'/);
});

test('album targets retain concrete coin identity and album provenance',()=>{
  assert.match(alerts,/coinId:coin\.id/);
  assert.match(alerts,/targetAlbumId:album\.id/);
  assert.match(alerts,/targetAlbumName:album\.name/);
  assert.match(alerts,/targetSource:album\.kind==='dreams'/);
});

test('auction matches expose the concrete target coin id',()=>{
  assert.match(alerts,/coinId:t\.coinId\|\|t\.id\|\|null/);
  assert.match(alerts,/targetSource:t\.targetSource\|\|'watchlist'/);
});

test('deduplication prefers coin id for real saved target records',()=>{
  assert.match(alerts,/x\.coinId\?`coin:\$\{x\.coinId\}`/);
});
