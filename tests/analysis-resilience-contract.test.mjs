import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const src=fs.readFileSync('analysis-resilience.js','utf8');

test('analysis recovery tracks only the exact Stage 1 and Stage 2 API paths',()=>{
  assert.match(src,/function requestPath\(input\)/);
  assert.match(src,/\['\/api\/analyze','\/api\/analyze-detail'\]\.includes\(requestPath\(input\)\)/);
  assert.match(src,/requestPath\(input\)==='\/api\/analyze-detail'/);
  assert.doesNotMatch(src,/url\.endsWith\('\/api\/analyze'/);
  assert.doesNotMatch(src,/url\.includes\('analyze-detail'\)/);
});

test('analysis recovery feedback is localized for all supported UI languages',()=>{
  for(const l of ['pl','en','de','fr'])assert.match(src,new RegExp(`${l}:\\{restoring:`));
  assert.match(src,/ApoLanguageRegistry\?\.current/);
  for(const key of ['restoring','photosManual','resume1','need1','restore1','resume2'])assert.ok(src.includes(`tx('${key}')`),key);
});

test('analysis recovery preserves bounded retry and stage1 response cache semantics',()=>{
  assert.match(src,/MAX_RETRIES = 1/);
  assert.match(src,/recoveryCache\?\.stage1/);
  assert.match(src,/next\.recoveryCache\[stage\]/);
  assert.match(src,/delete next\.pending/);
});
