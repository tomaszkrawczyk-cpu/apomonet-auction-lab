import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

function helper(){
  const sandbox={
    console,
    document:{readyState:'loading',addEventListener(){}},
  };
  sandbox.window=sandbox;
  vm.runInNewContext(read('derived-analysis-invalidation.js'),sandbox,{filename:'derived-analysis-invalidation.js'});
  return sandbox.ApoDerivedInvalidation;
}

test('accepted identity correction invalidates stale Stage 2, catalog and valuation data',()=>{
  const {invalidate}=helper();
  const rawAI={
    nominal:'wielodukat',
    ruler:'Zygmunt III Waza',
    year:'1621',
    mint:'Wilno',
    metal:'złoto',
    variant:'wariant AI',
    rarity:'R3',
  };
  const coin={
    id:'coin-1',
    ...rawAI,
    nominal:'dukat',
    mint:'Nagybánya',
    userAccepted:true,
    rawAI,
    obverseImage:'obverse-photo',
    reverseImage:'reverse-photo',
    detail:{variant:'stary wariant',kopickiReference:'1234',fullDescription:'Stary opis szczegółowy'},
    kopickiReference:'1234',
    kopickiRarity:'R3',
    auctionRecords10y:12,
    marketMedian:4200,
    estimateLow:3500,
    estimateHigh:5000,
    analysisLevel:'detailed',
  };

  const result=invalidate(coin);

  assert.equal(result.id,'coin-1');
  assert.equal(result.nominal,'dukat');
  assert.equal(result.mint,'Nagybánya');
  assert.equal(result.obverseImage,'obverse-photo');
  assert.equal(result.reverseImage,'reverse-photo');
  assert.equal(result.detail,undefined);
  assert.equal(result.kopickiReference,undefined);
  assert.equal(result.kopickiRarity,undefined);
  assert.equal(result.auctionRecords10y,undefined);
  assert.equal(result.marketMedian,undefined);
  assert.equal(result.estimateLow,undefined);
  assert.equal(result.estimateHigh,undefined);
  assert.equal(result.analysisLevel,'basic');
  assert.equal(result.needsDetailedAnalysis,true);
  assert.equal(result.derivedDataStale,true);
  assert.equal(result.previousDetailAudit.detail.fullDescription,'Stary opis szczegółowy');
});

test('variant correction is identity-significant because it can change Kopicki mapping',()=>{
  const {changedIdentityFields}=helper();
  const rawAI={nominal:'ort',ruler:'Zygmunt III Waza',year:'1623',mint:'Bydgoszcz',metal:'srebro',variant:'odmiana A'};
  const changed=changedIdentityFields({...rawAI,variant:'odmiana B',rawAI,userAccepted:true});
  assert.deepEqual([...changed],['variant']);
});

test('unchanged accepted identity leaves valid Stage 2 untouched',()=>{
  const {invalidate}=helper();
  const rawAI={nominal:'ort',ruler:'Zygmunt III Waza',year:'1623',mint:'Bydgoszcz',metal:'srebro',variant:'odmiana A'};
  const coin={...rawAI,rawAI,userAccepted:true,detail:{variant:'odmiana A'},kopickiReference:'K. 1234'};
  assert.deepEqual(invalidate(coin),coin);
});
