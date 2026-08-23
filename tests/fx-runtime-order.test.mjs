import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const ui=readFileSync(new URL('../auction-record-cost-ui.js',import.meta.url),'utf8');
test('FX date policy loads before FX valuation policy',()=>{
  const datePolicy=app.indexOf('auction-fx-date-policy.js');
  const fxPolicy=app.indexOf('auction-fx-policy.js');
  assert.ok(datePolicy>=0,'FX date policy missing from runtime');
  assert.ok(fxPolicy>datePolicy,'FX date policy must load before FX valuation policy');
});
test('auction cards expose FX date proximity and quarantine stale FX',()=>{
  assert.match(ui,/ApoAuctionFxDate\?\.assess/);
  assert.match(ui,/kurs zbyt odległy od daty sprzedaży/);
  assert.match(ui,/bez wpływu na wycenę PLN/);
});
