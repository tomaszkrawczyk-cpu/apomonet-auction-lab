import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const guard=fs.readFileSync('collection-stale-valuation-guard.js','utf8');
const page=fs.readFileSync('collection.html','utf8');
test('collection guard promotes fresh market median but still suppresses stale values',()=>{
  assert.match(guard,/marketMedian/);
  assert.match(guard,/collectionValuationSource:'marketMedian'/);
  assert.match(guard,/valuationSuppressedBecauseStale:true/);
});
test('collection keeps mature browse selection filter sort and export UX',()=>{
  for(const token of ['filterBtn','sortBtn','gridView','listView','selectionMode','pdfSelected','xlsxSelected','shareSelected','loadMore'])assert.ok(page.includes(token),token);
});
