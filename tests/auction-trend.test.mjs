import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
const core=readFileSync(new URL('../auction-trend-core.js',import.meta.url),'utf8');
const ui=readFileSync(new URL('../auction-trend-ui.js',import.meta.url),'utf8');
test('trend needs enough evidence in both periods',()=>{
  assert.match(core,/dated\.length<4/);
  assert.match(core,/recent\.length<2\|\|older\.length<2/);
});
test('trend uses conservative fifteen percent threshold',()=>{
  assert.match(core,/changePct>=15/);
  assert.match(core,/changePct<=-15/);
});
test('trend remains informational in UI',()=>{
  assert.match(ui,/Trend jest informacyjny i nie zastępuje wyceny/);
});
