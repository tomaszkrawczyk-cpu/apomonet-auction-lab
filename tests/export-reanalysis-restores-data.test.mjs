import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync('export-record-view.js','utf8');

function normalize(coin){
  const state={coins:[coin]};
  const ApoMonet={load:()=>state};
  const sandbox={location:{pathname:'/export.html'},ApoMonet,window:null};
  sandbox.window=sandbox;
  vm.runInNewContext(source,sandbox,{filename:'export-record-view.js'});
  return sandbox.ApoExportRecordView.normalize(coin);
}

test('successful reanalysis restores fresh catalog literature and market data to export',()=>{
  const coin={id:'fresh',ruler:'Jan II Kazimierz',nominal:'talar',year:'1649',mint:'Toruń',derivedDataStale:false,needsReanalysis:false,detail:{catalogEvidenceStatus:'supported-by-stage2-variant-evidence',kopickiReference:'Kopicki 8339',kopickiRarity:'R5'},kopickiReference:'Kopicki 8339',kopickiRarity:'R5',tyszkiewiczReference:'T. 12',tyszkiewiczValue:'8',parchimowiczReference:'P. 99',marketMedian:4200,priceRange:'3800–4700 PLN'};
  const out=normalize(coin);
  assert.equal(out.kopickiReference,'Kopicki 8339');
  assert.equal(out.kopickiRarity,'R5');
  assert.equal(out.tyszkiewiczReference,'T. 12');
  assert.equal(out.parchimowiczReference,'P. 99');
  assert.equal(out.marketMedian,4200);
  assert.equal(out.priceRange,'3800–4700 PLN');
  assert.equal(out.valuationSuppressedBecauseStale,undefined);
  assert.equal(out.literatureSuppressedBecauseStale,undefined);
});

test('stale record remains suppressed until market reanalysis clears stale state',()=>{
  const coin={id:'stale',derivedDataStale:true,needsReanalysis:true,detail:{catalogEvidenceStatus:'supported-by-stage2-variant-evidence',kopickiReference:'K. old'},kopickiReference:'K. old',tyszkiewiczReference:'T. old',marketMedian:9999};
  const out=normalize(coin);
  assert.equal(out.kopickiReference,'');
  assert.equal(out.tyszkiewiczReference,undefined);
  assert.equal(out.marketMedian,undefined);
  assert.equal(out.valuationSuppressedBecauseStale,true);
  assert.equal(out.literatureSuppressedBecauseStale,true);
});
