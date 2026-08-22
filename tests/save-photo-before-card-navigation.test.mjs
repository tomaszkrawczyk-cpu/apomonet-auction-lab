import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const nav=readFileSync(new URL('../analysis-save-open-card.js',import.meta.url),'utf8');

test('saved coin navigation verifies the exact record before opening the card',()=>{
  assert.match(nav,/savedCoinLink/);
  assert.match(nav,/coin\.html\?id=/);
  assert.match(nav,/ApoMonet\.getCoin/);
});

test('missing obverse or reverse is recovered from the current analysis previews before navigation',()=>{
  assert.match(nav,/obverseImage/);
  assert.match(nav,/reverseImage/);
  assert.match(nav,/document\.getElementById\('oi'\)/);
  assert.match(nav,/document\.getElementById\('ri'\)/);
  assert.match(nav,/ApoMonet\.upsertCoin/);
});

test('navigation happens only after the recovery check',()=>{
  const verify=nav.indexOf('ApoMonet.getCoin');
  const go=nav.lastIndexOf('location.href');
  assert.ok(verify>=0&&go>verify);
});
