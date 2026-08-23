import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=p=>fs.readFileSync(p,'utf8');

test('WCN automation is disabled until separate permission or rights approval',()=>{
  const policy=JSON.parse(read('SOURCE_ADAPTER_POLICY_2026-08-14.json'));
  const api=read('api/market-fact.js');
  const ui=read('wcn-batch-import.js');
  assert.equal(policy.sources.WCN.automation,'RED');
  assert.equal(policy.sources.WCN.factsManual,true);
  assert.equal(policy.sources.WCN.marketSingleRecord,false);
  assert.equal(policy.sources.WCN.marketBoundedBatch,false);
  assert.match(api,/SOURCE_AUTOMATION_NOT_APPROVED/);
  assert.match(api,/status\(403\)/);
  assert.doesNotMatch(api,/fetch\(url/);
  assert.match(ui,/enabled:false/);
  assert.doesNotMatch(ui,/\/api\/market-fact/);
});

test('other red sources remain manual/reference-only rather than automated',()=>{
  const policy=JSON.parse(read('SOURCE_ADAPTER_POLICY_2026-08-14.json'));
  for(const source of ['NUMISBIDS','COINSTRAIL','NIEMCZYK'])assert.equal(policy.sources[source].automation,'RED',source);
  assert.equal(policy.rules.storeSourceDescriptions,false);
  assert.equal(policy.rules.storeSourceImagesWithoutPermission,false);
  assert.equal(policy.rules.bypassCaptchaLoginPaywall,false);
});
