import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const fix=readFileSync(new URL('../coin-stage2-summary-fix.js',import.meta.url),'utf8');
const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');

test('saved coin summary prefers Stage 2 catalog data',()=>{
  assert.match(fix,/detail\.kopickiRarity\|\|candidate\.rarity\|\|coin\.rarity/);
  assert.match(fix,/detail\.kopickiReference\|\|candidate\.reference\|\|coin\.catalog/);
  assert.match(fix,/detail\.variant\|\|coin\.variant/);
});

test('unconfirmed catalog candidate is visibly marked as candidate',()=>{
  assert.match(fix,/— kandydat/);
  assert.match(fix,/Wymaga potwierdzenia katalogowego/);
});

test('runtime loads saved coin Stage 2 summary fix',()=>{
  assert.match(app,/coin-stage2-summary-fix\.js/);
});
