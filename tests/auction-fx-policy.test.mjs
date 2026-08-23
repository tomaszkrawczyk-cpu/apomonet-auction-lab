import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
const core=readFileSync(new URL('../auction-fx-core.js',import.meta.url),'utf8');
const policy=readFileSync(new URL('../auction-fx-policy.js',import.meta.url),'utf8');
const ui=readFileSync(new URL('../auction-record-cost-ui.js',import.meta.url),'utf8');
test('foreign currency requires rate target date and source',()=>{
  assert.match(core,/fxRate/);
  assert.match(core,/fxTo/);
  assert.match(core,/fxDate/);
  assert.match(core,/fxSource/);
  assert.match(core,/if\(!hasFx\(r,to\)\)return 0/);
});
test('records without explicit FX are excluded from target-currency valuation',()=>{
  assert.match(policy,/!window\.ApoAuctionFx\?\.hasFx\?\.\(r,target\)/);
  assert.match(policy,/ApoAuctionFxDate\?\.assess\?\.\(r\)/);
  assert.match(policy,/fxMissingCount/);
  assert.match(policy,/nie ma wiarygodnego FX z datą bliską sprzedaży/);
});
test('comparison UI shows conversion provenance or explicit no-FX warning',()=>{
  assert.match(ui,/Przeliczenie FX/);
  assert.match(ui,/kurs \$\{esc\(String\(r\.fxRate\)\)\}/);
  assert.match(ui,/brak zweryfikowanego kursu z datą i źródłem/);
});
