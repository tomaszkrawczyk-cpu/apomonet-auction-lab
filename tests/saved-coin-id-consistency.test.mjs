import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const analyze=readFileSync(new URL('../analyze.html',import.meta.url),'utf8');
const card=readFileSync(new URL('../coin.html',import.meta.url),'utf8');

test('analysis save persists current id and then adopts returned coin id',()=>{
  assert.match(analyze,/id:\s*id\s*\|\|\s*undefined/);
  assert.match(analyze,/id\s*=\s*c\.id/);
});

test('saved actions link uses the exact saved coin id',()=>{
  assert.match(analyze,/"coin\.html\?id="\s*\+\s*encodeURIComponent\(c\.id\)/);
});

test('coin card loads only the id from the URL and fetches that record',()=>{
  assert.match(card,/new URLSearchParams\(location\.search\)\.get\('id'\)/);
  assert.match(card,/const coin=id\?ApoMonet\.getCoin\(id\):null/);
});

test('coin card clears stale analysis session when it belongs to another coin',()=>{
  assert.match(card,/s\?\.id&&s\.id!==coin\.id/);
  assert.match(card,/sessionStorage\.removeItem\('apomonetAnalysisSession'\)/);
});
