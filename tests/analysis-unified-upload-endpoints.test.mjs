import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const src=fs.readFileSync('analysis-unified-upload.js','utf8');

test('unified upload transport handler recognizes only Stage 1 and Stage 2 endpoints',()=>{
  assert.match(src,/\['\/api\/analyze','\/api\/analyze-detail'\]\.includes\(endpoint\(input\)\)/);
  assert.doesNotMatch(src,/includes\('\/api\/analyze'\)/);
  assert.match(src,/typeof input==='string'/);
  assert.match(src,/input\?\.url/);
});
