import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const albumFix=readFileSync(new URL('../analysis-album-save-fix.js',import.meta.url),'utf8');
const analyze=readFileSync(new URL('../analyze.html',import.meta.url),'utf8');
const core=readFileSync(new URL('../app-core.js',import.meta.url),'utf8');

test('album assignment always uses the coin being assigned, not a stale analysis id',()=>{
  assert.match(albumFix,/syncPendingCoinId\(coinId\)/);
  assert.match(albumFix,/ApoMonet\.getCoin\(coinId\)/);
  assert.match(albumFix,/previous\.call\(ApoMonet,coinId,albumId\)/);
});

test('album save recovers both current analysis photos onto that same record',()=>{
  assert.match(albumFix,/previewSource\('oi'\)\|\|\(persistentImage\(coin\?\.obverseImage\)\?coin\.obverseImage:''\)/);
  assert.match(albumFix,/previewSource\('ri'\)\|\|\(persistentImage\(coin\?\.reverseImage\)\?coin\.reverseImage:''\)/);
  assert.match(albumFix,/obverseImage:obverse\|\|null,reverseImage:reverse\|\|null/);
});

test('analysis save persists the full current accepted object before album assignment',()=>{
  assert.match(analyze,/const c = ApoMonet\.upsertCoin\(\{/);
  assert.match(analyze,/\.\.\.a,/);
  assert.match(analyze,/obverseImage: imgs\[0\]/);
  assert.match(analyze,/reverseImage: imgs\[1\]/);
});

test('core upsert merges into the existing record instead of replacing it wholesale',()=>{
  assert.match(core,/\.\.\.\(old\|\|\{\}\)/);
  assert.match(core,/\.\.\.c/);
});
