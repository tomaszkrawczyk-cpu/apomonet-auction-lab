import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=p=>fs.readFileSync(p,'utf8');

test('export view suppresses stale market catalog and literature data after identity correction',()=>{
  const source=read('export-record-view.js');
  assert.match(source,/derivedDataStale\|\|coin\.needsReanalysis/);
  assert.match(source,/valuationSuppressedBecauseStale=true/);
  assert.match(source,/literatureSuppressedBecauseStale=true/);
  assert.match(source,/stale-after-identity-correction/);
  for(const token of ['estimatedPrice','marketMedian','priceRange','estimateLow','estimateHigh','tyszkiewiczReference','tyszkiewiczValue','parchimowiczReference'])assert.ok(source.includes(`'${token}'`),token);
});

test('XLSX export never publishes stale derived market or catalog evidence',()=>{
  const source=read('xlsx-sheet.js');
  assert.match(source,/valuationSuppressedBecauseStale/);
  assert.match(source,/marketValue=stale\?'':/);
  assert.match(source,/marketRange=stale\?'':/);
  assert.match(source,/stale\?'':\(c\.tyszkiewiczReference/);
  assert.match(source,/stale\?'':\(c\.parchimowiczReference/);
  assert.match(source,/Wymaga ponownej analizy po korekcie identyfikacji/);
});
