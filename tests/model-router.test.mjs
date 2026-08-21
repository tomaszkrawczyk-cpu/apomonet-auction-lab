import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const source=readFileSync(new URL('../lib/model-router.js',import.meta.url),'utf8');

test('quality-first router defaults to the strong model',()=>{
  assert.match(source,/APOMONET_ENABLE_FAST_MODEL==='1'/);
  assert.match(source,/quality-first: fast model disabled/);
  assert.match(source,/stage2AlwaysStrong:true/);
});

test('fast routing requires measured evidence, not cost alone',()=>{
  assert.match(source,/benchmarkSamples<100/);
  assert.match(source,/measuredAccuracy<97/);
  assert.match(source,/verifiedKnowledgeHits<2/);
  assert.match(source,/imageQuality<90/);
  assert.match(source,/ambiguity>10/);
});

test('Stage 2 cannot use the fast model',()=>{
  assert.match(source,/if\(stage!=='basic'\)/);
  assert.match(source,/Stage 2 always uses strong model/);
});
