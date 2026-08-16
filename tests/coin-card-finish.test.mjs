import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('coin card recovery is loaded globally but only runs on coin.html',()=>{
  const app=read('app.js');
  const finish=read('coin-card-finish.js');
  assert.match(app,/coin-card-finish\.js/);
  assert.match(finish,/location\.pathname\.endsWith\('coin\.html'\)/);
});

test('missing saved photos are recovered only for the exact active coin',()=>{
  const finish=read('coin-card-finish.js');
  assert.match(finish,/session\?\.id===id/);
  assert.match(finish,/!coin\.obverseImage&&session\.imgs\[0\]/);
  assert.match(finish,/!coin\.reverseImage&&session\.imgs\[1\]/);
  assert.match(finish,/ApoMonet\.upsertCoin\(patch\)/);
});

test('finished card includes immediate saved confirmation and two-photo mobile layout',()=>{
  const finish=read('coin-card-finish.js');
  assert.match(finish,/Zapisano do kolekcji/);
  assert.match(finish,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(finish,/Zdjęcia i zaakceptowane dane tej monety są zapisane razem/);
});
