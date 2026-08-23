import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync('home-dashboard-summary.js','utf8');

test('home dashboard excludes stale records from valuation total',()=>{
  assert.match(source,/record\?\.derivedDataStale\|\|record\?\.needsReanalysis/);
  assert.match(source,/if\(stale\(record\)\)\{staleCount\+\+;continue\}/);
  assert.match(source,/wliczane do sumy/);
});
