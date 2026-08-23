import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
const core=readFileSync(new URL('../auction-fx-date-policy.js',import.meta.url),'utf8');
test('historical FX accepts only a narrow date window',()=>{
  assert.match(core,/days<=3/);
  assert.match(core,/days<=1/);
});
test('distant FX is explicitly rejected for valuation use',()=>{
  assert.match(core,/ok:days<=3/);
  assert.match(core,/Kurs zbyt odległy od daty sprzedaży/);
});
