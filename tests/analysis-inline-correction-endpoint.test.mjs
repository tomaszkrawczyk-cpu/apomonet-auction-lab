import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync('analysis-inline-correction.js','utf8');

test('inline correction captures only the Stage 1 analyze endpoint',()=>{
  assert.match(source,/function isStage1Request/);
  assert.match(source,/pathname==='\/api\/analyze'/);
  assert.doesNotMatch(source,/includes\('\/api\/analyze'\)/);
});

test('Stage 2 cannot overwrite the stored Stage 1 correction base through endpoint prefix matching',()=>{
  assert.match(source,/if\(isStage1Request\(input\)&&response\.ok\)/);
  assert.match(source,/apomonetLastAnalysisV1/);
});
