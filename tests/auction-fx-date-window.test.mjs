import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
const core=readFileSync(new URL('../auction-fx-date-core.js',import.meta.url),'utf8');
test('historical FX accepts only a narrow date window',()=>{
  assert.match(core,/days<=3/);
  assert.match(core,/days===0/);
  assert.match(core,/days<=1/);
});
test('distant FX is explicitly rejected for valuation use',()=>{
  assert.match(core,/too-distant/);
  assert.match(core,/acceptable:false/);
});
