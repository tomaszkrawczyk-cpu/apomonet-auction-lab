import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const workflow=fs.readFileSync('.github/workflows/regression.yml','utf8');

test('CI runs module, contract and root regression tests',()=>{
  assert.match(workflow,/node --test/);
  assert.match(workflow,/tests\/\*\.test\.mjs/);
  assert.match(workflow,/tests\/\*\.test\.js/);
  assert.match(workflow,/(?:^|\s)\*\.test\.mjs/);
});

test('known nonstandard regression files are covered by the workflow globs',()=>{
  assert.ok(fs.existsSync('tests/action-feedback-contract.test.js'));
  assert.ok(fs.existsSync('stage2-literature-ui.test.mjs'));
});
