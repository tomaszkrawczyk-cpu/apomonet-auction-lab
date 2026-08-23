import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=p=>fs.readFileSync(p,'utf8');

test('Stage 2 backend consumes literature policy and has specialist schema fields',()=>{
  const api=read('api/analyze-detail.js');
  assert.match(api,/body\.literaturePolicy/);
  assert.match(api,/safeLiteraturePolicy/);
  assert.match(api,/tyszkiewiczReference/);
  assert.match(api,/tyszkiewiczValue/);
  assert.match(api,/parchimowiczReference/);
  assert.match(api,/Wolno rozważać i zwracać wyłącznie pozycje obecne w references tej polityki/i);
});

test('Stage 2 backend clears specialist literature that policy did not allow',()=>{
  const api=read('api/analyze-detail.js');
  assert.match(api,/allowedLiterature/);
  assert.match(api,/detail\.tyszkiewiczReference\s*=\s*""/);
  assert.match(api,/detail\.tyszkiewiczValue\s*=\s*""/);
  assert.match(api,/detail\.parchimowiczReference\s*=\s*""/);
});

test('client only surfaces literature identifiers selected by evidence policy',()=>{
  const client=read('stage2-literature-request.js');
  assert.match(client,/new Set\(\(policy\?\.references/);
  assert.match(client,/allowed\.has/);
  assert.match(client,/historicalValueOnly:true/);
  assert.match(client,/policyMethod/);
});

test('literature selector is evidence based and never selects Tyszkiewicz or Parchimowicz by year alone',()=>{
  const policy=read('catalog-literature-policy.js');
  assert.match(policy,/method:'evidence-based'/);
  assert.match(policy,/tyszkiewiczReference\|\|coin\.tyszkiewiczValue\|\|coin\.sourceEvidence\?\.tyszkiewicz/);
  assert.match(policy,/parchimowiczReference\|\|coin\.sourceEvidence\?\.parchimowicz/);
  assert.doesNotMatch(policy,/year\s*[<>]=?\s*\d{3,4}/);
});
