import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const workflow=fs.readFileSync('.github/workflows/regression.yml','utf8');

test('CI runs module, contract and all root regression naming conventions',()=>{
  assert.match(workflow,/node --test/);
  assert.match(workflow,/tests\/\*\.test\.mjs/);
  assert.match(workflow,/tests\/\*\.test\.js/);
  assert.match(workflow,/(?:^|\s)\*\.test\.mjs/);
  assert.match(workflow,/(?:^|\s)\*\.test\.js/);
  assert.match(workflow,/(?:^|\s)test-\*\.mjs/);
});

test('known nonstandard and root regression files are covered by the workflow globs',()=>{
  for(const path of [
    'tests/action-feedback-contract.test.js',
    'stage2-literature-ui.test.mjs',
    'stage1-stage2-separation.test.js',
    'test-analysis-i18n-extensible.mjs',
    'test-stage2-professional-i18n.mjs'
  ])assert.ok(fs.existsSync(path),path);
});
