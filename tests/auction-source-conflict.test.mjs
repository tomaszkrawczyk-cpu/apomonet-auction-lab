import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
const core=readFileSync(new URL('../auction-source-conflict-core.js',import.meta.url),'utf8');
const policy=readFileSync(new URL('../auction-source-conflict-policy.js',import.meta.url),'utf8');
const ui=readFileSync(new URL('../auction-record-cost-ui.js',import.meta.url),'utf8');
test('same sale with different prices is detected as source conflict',()=>{
  assert.match(core,/hammerPrice','realizedPrice','totalPrice/);
  assert.match(core,/if\(vals\.length>1\)fields\.push\(k\)/);
  assert.match(core,/if\(bases\.length>1\)fields\.push\('priceBasis'\)/);
});
test('conflicting record ids are excluded from valuation evidence',()=>{
  assert.match(policy,/badIds=new Set\(conflicts\.flatMap/);
  assert.match(policy,/filter\(r=>!badIds\.has\(String\(r\.id\)\)\)/);
  assert.match(policy,/sporne rekordy nie wpływają na widełki/);
});
test('analysis UI explains source conflict instead of hiding it',()=>{
  assert.match(ui,/Konflikt danych źródłowych/);
  assert.match(ui,/data-source-conflict/);
  assert.match(ui,/nie wpływają na wycenę/);
});
