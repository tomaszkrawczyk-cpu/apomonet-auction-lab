import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

function helper(){
  const sandbox={console,document:{readyState:'loading',addEventListener(){}}};
  sandbox.window=sandbox;
  vm.runInNewContext(read('derived-analysis-invalidation.js'),sandbox,{filename:'derived-analysis-invalidation.js'});
  return sandbox.ApoDerivedInvalidation;
}

test('accepted identity correction invalidates stale Stage 2 catalog literature and valuation data',()=>{
  const {invalidate}=helper();
  const rawAI={nominal:'wielodukat',ruler:'Zygmunt III Waza',year:'1621',mint:'Wilno',metal:'złoto',variant:'wariant AI',rarity:'R3'};
  const coin={id:'coin-1',...rawAI,nominal:'dukat',mint:'Nagybánya',userAccepted:true,rawAI,obverseImage:'obverse-photo',reverseImage:'reverse-photo',detail:{variant:'stary wariant',kopickiReference:'1234',fullDescription:'Stary opis szczegółowy'},kopickiReference:'1234',kopickiRarity:'R3',tyszkiewiczReference:'T. 12',tyszkiewiczValue:'8',parchimowiczReference:'P. 99',specialistReferences:[{id:'other'}],literatureEvidence:{source:'old-match'},auctionRecords10y:12,marketMedian:4200,estimateLow:3500,estimateHigh:5000,analysisLevel:'detailed'};
  const result=invalidate(coin);
  assert.equal(result.id,'coin-1');assert.equal(result.nominal,'dukat');assert.equal(result.mint,'Nagybánya');assert.equal(result.obverseImage,'obverse-photo');assert.equal(result.reverseImage,'reverse-photo');
  for(const key of ['detail','kopickiReference','kopickiRarity','tyszkiewiczReference','tyszkiewiczValue','parchimowiczReference','specialistReferences','literatureEvidence','auctionRecords10y','marketMedian','estimateLow','estimateHigh'])assert.equal(result[key],undefined,key);
  assert.equal(result.analysisLevel,'basic');assert.equal(result.needsDetailedAnalysis,true);assert.equal(result.derivedDataStale,true);assert.equal(result.previousDetailAudit.detail.fullDescription,'Stary opis szczegółowy');
});

test('variant correction is identity-significant because it can change Kopicki mapping',()=>{const {changedIdentityFields}=helper();const rawAI={nominal:'ort',ruler:'Zygmunt III Waza',year:'1623',mint:'Bydgoszcz',metal:'srebro',variant:'odmiana A'};assert.deepEqual([...changedIdentityFields({...rawAI,variant:'odmiana B',rawAI,userAccepted:true})],['variant'])});

test('Stage 2 cannot silently overwrite an accepted variant',()=>{const {protectAcceptedDetail}=helper();const guarded=protectAcceptedDetail({variant:'odmiana A',warnings:[],fullDescription:'Opis obserwacji stempla'},{userAccepted:true,variant:'odmiana B'});assert.equal(guarded.variant,'odmiana B');assert.equal(guarded.variantCandidate,'odmiana A');assert.match(guarded.warnings.at(-1),/zachowano odmianę zaakceptowaną przez użytkownika/i)});

test('Stage 2 variant remains unchanged when it agrees with accepted variant',()=>{const {protectAcceptedDetail}=helper();const guarded=protectAcceptedDetail({variant:'odmiana B',warnings:[]},{userAccepted:true,variant:'odmiana B'});assert.equal(guarded.variant,'odmiana B');assert.equal(guarded.variantCandidate,undefined)});

test('Kopicki and rarity stay hidden when Stage 2 variant evidence is weak',()=>{const {gateCatalogEvidence}=helper();const guarded=gateCatalogEvidence({variant:'odmiana z kropką za łapą niedźwiedzia',kopickiReference:'Kopicki 7483',kopickiRarity:'R4',confidence:72,diagnosticFeatures:['kropka za łapą niedźwiedzia'],warnings:[]});assert.equal(guarded.kopickiReference,'');assert.equal(guarded.kopickiRarity,'');assert.equal(guarded.catalogEvidenceStatus,'unconfirmed');assert.equal(guarded.catalogCandidate.reference,'Kopicki 7483');assert.match(guarded.warnings.at(-1),/nie pokazano jako potwierdzonych/i)});

test('Kopicki and rarity pass only with concrete variant evidence',()=>{const {gateCatalogEvidence}=helper();const guarded=gateCatalogEvidence({variant:'odmiana z kropką za łapą niedźwiedzia',kopickiReference:'Kopicki 7483',kopickiRarity:'R4',confidence:86,diagnosticFeatures:['kropka za łapą niedźwiedzia','układ końcówki legendy PR'],warnings:[]});assert.equal(guarded.kopickiReference,'Kopicki 7483');assert.equal(guarded.kopickiRarity,'R4');assert.equal(guarded.catalogEvidenceStatus,'supported-by-stage2-variant-evidence');assert.equal(guarded.catalogCandidate,undefined)});

test('unchanged accepted identity leaves valid Stage 2 untouched',()=>{const {invalidate}=helper();const rawAI={nominal:'ort',ruler:'Zygmunt III Waza',year:'1623',mint:'Bydgoszcz',metal:'srebro',variant:'odmiana A'};const coin={...rawAI,rawAI,userAccepted:true,detail:{variant:'odmiana A'},kopickiReference:'K. 1234'};assert.deepEqual(invalidate(coin),coin)});
