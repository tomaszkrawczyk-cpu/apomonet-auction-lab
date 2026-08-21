import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
function helper(){
  const sandbox={console,document:{readyState:'loading',addEventListener(){}}};
  sandbox.window=sandbox;
  vm.runInNewContext(read('knowledge-trust-core.js'),sandbox,{filename:'knowledge-trust-core.js'});
  return sandbox.ApoKnowledgeTrust;
}

test('plain AI result remains only a suggestion',()=>{
  const k=helper();
  const row=k.stamp({ruler:'Zygmunt III Waza',nominal:'ort'});
  assert.equal(row.knowledgeTrust.level,'ai_suggestion');
  assert.equal(k.canInfluenceLearning(row),false);
  assert.equal(k.canPromoteToCatalogKnowledge(row),false);
});

test('accepted user correction can teach but cannot become catalog truth by itself',()=>{
  const k=helper();
  const rawAI={ruler:'Zygmunt III Waza',nominal:'wielodukat',year:'1621'};
  const row=k.stamp({ruler:'Zygmunt III Waza',nominal:'dukat',year:'1621',rawAI,userAccepted:true,correctedAt:'2026-08-21T12:00:00Z'});
  assert.equal(row.knowledgeTrust.level,'user_corrected');
  assert.equal(k.canInfluenceLearning(row),true);
  assert.equal(k.canPromoteToCatalogKnowledge(row),false);
  assert.ok(row.knowledgeTrust.evidence.some(x=>x.kind==='user_correction'));
});

test('expert verification is strong enough for catalog knowledge',()=>{
  const k=helper();
  const row=k.stamp({expertVerified:true,verifiedAt:'2026-08-21T12:00:00Z'});
  assert.equal(row.knowledgeTrust.level,'expert_verified');
  assert.equal(k.canPromoteToCatalogKnowledge(row),true);
});

test('two-source verified record gets the highest trust level',()=>{
  const k=helper();
  const row=k.stamp({status:'verified',sources:['WCN','NOMISMA'],provenance:[{source:'WCN',url:'https://example.test/a'},{source:'NOMISMA',url:'https://example.test/b'}]});
  assert.equal(row.knowledgeTrust.level,'multi_source_verified');
  assert.equal(k.canPromoteToCatalogKnowledge(row),true);
  assert.equal(row.knowledgeTrust.rank,90);
});

test('runtime loads the unified trust layer',()=>{
  const app=read('app.js');
  assert.match(app,/knowledge-trust-core\.js/);
});
