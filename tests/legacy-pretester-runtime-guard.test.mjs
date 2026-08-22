import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('legacy pretester shortcut is not wired into the active runtime',()=>{
  const app=read('app.js');
  assert.doesNotMatch(app,/pretester-stability-fix\.js/);
  assert.match(app,/derived-analysis-invalidation\.js/);
  assert.match(app,/stage2-literature-persist\.js/);
});

test('active Stage 2 persistence applies accepted-identity description reconciliation',()=>{
  const persist=read('stage2-literature-persist.js');
  assert.match(persist,/reconcileDetailDescription/);
  assert.match(persist,/rawAI/);
  assert.match(persist,/userAccepted/);
});
