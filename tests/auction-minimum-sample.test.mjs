import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=p=>fs.readFileSync(p,'utf8');

test('full valuation requires at least three strict comparable records',()=>{
  const source=read('auction-archive-core.js');
  assert.match(source,/strict\.length>=3/);
  assert.match(source,/strong\.length<4/);
  assert.match(source,/dominantBasis\(rows,minCount=3\)/);
  assert.match(source,/referenceOnly:true/);
});

test('small samples remain reference-only and do not persist a fake zero median',()=>{
  const ui=read('market-valuation-hook.js');
  assert.match(ui,/medianText=v\.canEstimate\?/);
  assert.match(ui,/marketMedian:v\.canEstimate\?v\.median:null/);
  assert.match(ui,/v\.canEstimate\?esc\(v\.priceRange\):'—'/);
});
