import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const source=readFileSync(new URL('../knowledge-trust-core.js',import.meta.url),'utf8');

test('user correction remains below expert verification',()=>{
  assert.match(source,/USER_CORRECTED:\{id:'user_corrected',rank:30/);
  assert.match(source,/EXPERT_VERIFIED:\{id:'expert_verified',rank:70/);
  assert.match(source,/if\(input\.userAccepted===true&&input\.rawAI\)return LEVELS\.USER_CORRECTED/);
});

test('expert promotion requires an explicit expert signal',()=>{
  assert.match(source,/input\.expertVerified===true\|\|input\.expertAccepted===true\|\|input\.verifiedByExpert===true/);
  assert.match(source,/return l\.rank>=LEVELS\.EXPERT_VERIFIED\.rank/);
});

test('multi-source promotion requires verified status and at least two sources',()=>{
  assert.match(source,/input\.status==='verified'&&Array\.isArray\(input\.sources\)&&input\.sources\.length>=2/);
});

test('user-corrected knowledge may influence learning without becoming catalog truth',()=>{
  assert.match(source,/canInfluenceLearning/);
  assert.match(source,/return l\.rank>=LEVELS\.USER_CORRECTED\.rank/);
  assert.match(source,/canPromoteToCatalogKnowledge/);
});
