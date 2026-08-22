import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
const ui=readFileSync(new URL('../auction-record-cost-ui.js',import.meta.url),'utf8');
test('auction comparison card labels actual auction result basis',()=>{
  assert.match(ui,/Cena młotkowa/);
  assert.match(ui,/Cena realizacji/);
  assert.match(ui,/Cena całkowita/);
});
test('buyer cost requires true hammer and verified house rule',()=>{
  assert.match(ui,/const hammer=Number\(r\?\.hammerPrice\)\|\|0/);
  assert.match(ui,/ApoAuctionCost\.calculateForHouse/);
  assert.match(ui,/cost\?\.complete\?cost:null/);
  assert.match(ui,/Brak ceny młotkowej lub zweryfikowanej reguły opłat/);
});
test('runtime loads auction comparison cost UI',()=>{
  const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
  assert.match(app,/auction-record-cost-ui\.js/);
});
