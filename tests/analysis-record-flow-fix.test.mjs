import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const repoRoot = new URL('../', import.meta.url);

async function text(path){
  return readFile(new URL(path, repoRoot), 'utf8');
}

test('fresh photo flow cannot silently reuse a previous coin id', async()=>{
  const source=await text('analysis-record-flow-fix.js');
  assert.match(source,/id=null/);
  assert.match(source,/panel'\)\?\.classList\.add\('hidden'\)/);
  assert.match(source,/albumPhotoPrep/);
});

test('album save navigates to the exact assigned record', async()=>{
  const source=await text('analysis-record-flow-fix.js');
  assert.match(source,/__apoLastAlbumCoinId/);
  assert.match(source,/coin\.html\?id=/);
  assert.match(source,/ApoMonet\?\.getCoin\?\.\(assignment\.coinId\)/);
});

test('saved detailed analysis is persisted and rendered by canonical modules', async()=>{
  const persist=await text('stage2-literature-persist.js');
  const card=await text('coin-card-finish.js');
  assert.match(persist,/detail,analysisLevel:'detailed'/);
  assert.match(persist,/ApoMonet\.upsertCoin\(next\)/);
  assert.match(card,/current\.detail/);
  assert.match(card,/Analiza szczegółowa/);
  assert.match(card,/diagnosticFeatures/);
});

test('basic recognition explicitly considers trial and pattern issues', async()=>{
  const source=await text('api/analyze.js');
  assert.match(source,/emisja próbna\/wzorcowa/);
  assert.match(source,/talar próbny/);
  assert.match(source,/sygnatur projektanta\/medaliera/);
});
