import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync('analysis-canonical-sentinels.js','utf8');

test('canonical sentinel wrapper only touches exact Stage 1 and Stage 2 endpoints',()=>{
  assert.match(source,/\['\/api\/analyze','\/api\/analyze-detail'\]\.includes\(path\)/);
  assert.doesNotMatch(source,/url\.includes\('\/api\/analyze'\)/);
  assert.match(source,/new URL\(raw,location\.href\)\.pathname/);
});

test('canonical sentinel wrapper is idempotent',()=>{
  assert.match(source,/__apoCanonicalSentinelFetch/);
});
