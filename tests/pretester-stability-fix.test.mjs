import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync('pretester-stability-fix.js','utf8');

test('legacy pretester reference script remains syntactically valid',()=>{
  assert.doesNotThrow(()=>new vm.Script(source));
});

test('legacy curated Kopicki mapping is visibly hardcoded and therefore must not become the runtime source of truth',()=>{
  assert.match(source,/Kopicki 8339/);
  assert.match(source,/rarity:'R5'/);
  assert.match(source,/Kopicki 8337/);
  assert.match(source,/rarity:'R4'/);
  assert.match(source,/1649/);
});

test('legacy recovery implementation documents the former retry and performance approach',()=>{
  assert.match(source,/apomonet_pending_analysis_v1/);
  assert.match(source,/AbortController/);
  assert.match(source,/BASIC_CLIENT_TIMEOUT_MS=48_000/);
  assert.match(source,/DETAIL_CLIENT_TIMEOUT_MS=58_000/);
  assert.match(source,/MAX_ATTEMPTS=2/);
  assert.match(source,/ApoAnalysisPerformance/);
});

test('legacy hotfix is intentionally excluded from current runtime',()=>{
  const app=fs.readFileSync('app.js','utf8');
  assert.doesNotMatch(app,/pretester-stability-fix\.js/);
  assert.match(app,/canonical-record-sentinels\.js/);
  assert.match(app,/analysis-resilience\.js/);
  assert.match(app,/analysis-progress-i18n\.js/);
});
