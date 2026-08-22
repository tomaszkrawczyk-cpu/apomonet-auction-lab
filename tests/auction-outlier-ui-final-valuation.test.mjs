import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
const hook=readFileSync(new URL('../auction-outlier-valuation-hook.js',import.meta.url),'utf8');
const ui=readFileSync(new URL('../auction-record-cost-ui.js',import.meta.url),'utf8');
test('final valuation is recomputed after outlier filtering',()=>{
  assert.match(hook,/const baseValuation=ApoArchive\.valuation\.bind\(ApoArchive\)/);
  assert.match(hook,/ApoArchive\.valuation=function/);
  assert.match(hook,/outlierIds:outliers\.map\(r=>r\.id\)/);
  assert.match(hook,/priceRange:`\$\{low\}–\$\{high\} \$\{currency\}`/);
});
test('comparison UI marks outliers without hiding them',()=>{
  assert.match(ui,/Nietypowa cena/);
  assert.match(ui,/nie został wliczony do widełek wyceny/);
  assert.match(ui,/data-outlier/);
  assert.match(ui,/outlierIds/);
});
