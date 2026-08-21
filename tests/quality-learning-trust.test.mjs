import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

function sandbox(){
  const store=new Map();
  const s={
    console,
    document:{readyState:'loading',addEventListener(){}},
    addEventListener(){},
    localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},
  };
  s.window=s;
  vm.runInNewContext(read('knowledge-trust-core.js'),s,{filename:'knowledge-trust-core.js'});
  vm.runInNewContext(read('quality-learning-core.js'),s,{filename:'quality-learning-core.js'});
  return s;
}

const raw={ruler:'Zygmunt III Waza',nominal:'wielodukat',year:'1621',mint:'Wilno',variant:'A'};
const corrected={ruler:'Zygmunt III Waza',nominal:'dukat',year:'1621',mint:'Nagybánya',variant:'B'};

test('a single user correction influences learning but only moderately',()=>{
  const s=sandbox();
  const row=s.ApoQualityLearning.rememberCorrection({...corrected,rawAI:raw,userAccepted:true});
  assert.equal(row.trustLevel,'user_corrected');
  const boost=s.ApoQualityLearning.learnedBoost(corrected,raw);
  assert.ok(boost>0);
  assert.ok(boost<=10,`user correction boost too strong: ${boost}`);
});

test('expert verification produces a stronger learning boost than a user correction',()=>{
  const s=sandbox();
  s.ApoQualityLearning.rememberCorrection({...corrected,rawAI:raw,userAccepted:true});
  const userBoost=s.ApoQualityLearning.learnedBoost(corrected,raw);
  s.ApoQualityLearning.rememberCorrection({...corrected,rawAI:raw,userAccepted:true,expertVerified:true});
  const expertBoost=s.ApoQualityLearning.learnedBoost(corrected,raw);
  assert.ok(expertBoost>userBoost,`${expertBoost} should exceed ${userBoost}`);
});

test('multi-source verified knowledge receives the strongest bounded boost',()=>{
  const s=sandbox();
  s.ApoQualityLearning.rememberCorrection({...corrected,rawAI:raw,userAccepted:true,status:'verified',sources:['A','B']});
  const boost=s.ApoQualityLearning.learnedBoost(corrected,raw);
  assert.ok(boost>=12);
  assert.ok(boost<=24);
});

test('master candidates require real fingerprint similarity regardless of memory boost',()=>{
  const source=read('quality-learning-core.js');
  assert.match(source,/matchedFeatures>=3&&x\.match\.similarity>=55/);
});
