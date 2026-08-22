import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const valuation=fs.readFileSync('collection-valuation-source.js','utf8');
const page=fs.readFileSync('collection.html','utf8');

test('canonical collection valuation prefers fresh market median and suppresses stale values',()=>{
  assert.match(valuation,/const direct=\[coin\.marketMedian,coin\.estimatedPrice/);
  assert.match(valuation,/coin\.derivedDataStale\|\|coin\.needsReanalysis\|\|coin\.valuationSuppressedBecauseStale/);
  assert.match(valuation,/if\(!coin\|\|.*return 0/);
});

test('collection keeps mature browse selection filter sort and export UX',()=>{
  for(const token of ['filterBtn','sortBtn','gridView','listView','selectionMode','pdfSelected','xlsxSelected','shareSelected','loadMore'])assert.ok(page.includes(token),token);
});
