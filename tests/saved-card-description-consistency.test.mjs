import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
const consistency=readFileSync(new URL('../correction-consistency.js',import.meta.url),'utf8');
const invalidation=readFileSync(new URL('../derived-analysis-invalidation.js',import.meta.url),'utf8');
const analyze=readFileSync(new URL('../analyze.html',import.meta.url),'utf8');
test('accepted identity correction reconciles stale description',()=>{
  assert.match(consistency,/function reconcileDescription\(coin\)/);
  assert.match(consistency,/changedValuesArePresent/);
  assert.match(consistency,/staleRawValuesPresent/);
  assert.match(consistency,/descriptionSource\s*:\s*["']accepted-correction["']/);
});
test('identity correction invalidates old detailed analysis before new Stage 2',()=>{
  assert.match(invalidation,/for \(const key of DERIVED_FIELDS\) delete output\[key\]/);
  assert.match(invalidation,/needsDetailedAnalysis = true/);
});
test('save persists current full description from the accepted live analysis',()=>{
  assert.match(analyze,/description: a\.fullDescription \|\| a\.description/);
});
