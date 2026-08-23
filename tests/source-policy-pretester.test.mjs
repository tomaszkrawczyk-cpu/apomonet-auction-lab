import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=p=>fs.readFileSync(p,'utf8');

test('restricted market sources stay manual-only before legal permission',()=>{
  const policy=JSON.parse(read('SOURCE_ADAPTER_POLICY_2026-08-14.json'));
  for(const source of ['WCN','NUMISBIDS','COINSTRAIL','NIEMCZYK']){
    assert.equal(policy.sources[source].automation,'RED');
    assert.equal(policy.sources[source].factsManual,true);
  }
  assert.equal(policy.sources.ONEBID.automation,'YELLOW');
});

test('WCN server adapter is disabled and cannot fetch external pages',()=>{
  const api=read('api/market-fact.js');
  assert.match(api,/SOURCE_AUTOMATION_NOT_APPROVED/);
  assert.doesNotMatch(api,/fetch\s*\(/);
  assert.doesNotMatch(api,/wcn\.pl\/archive/);
});

test('archive exposes manual market-fact entry only',()=>{
  const page=read('archive.html');
  assert.match(page,/Dodaj fakt cenowy ręcznie/);
  assert.doesNotMatch(page,/id="importBtn"/);
  assert.doesNotMatch(page,/\/api\/market-fact/);
});
