import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

function helper(){
  const sandbox={console,location:{pathname:'/tests',search:''},document:{readyState:'loading',addEventListener(){}},URLSearchParams};
  sandbox.window=sandbox;
  vm.runInNewContext(read('auction-context-navigation.js'),sandbox,{filename:'auction-context-navigation.js'});
  return sandbox.ApoAuctionContext;
}

test('auction link carries the concrete coin id and identification context',()=>{
  const {coinQuery,archiveUrl}=helper();
  const coin={id:'coin-77',ruler:'Zygmunt III Waza',nominal:'ort',year:'1623',mint:'Bydgoszcz',variant:'odmiana z kropką'};
  const query=coinQuery(coin);
  assert.match(query,/Zygmunt III Waza/);
  assert.match(query,/ort/);
  assert.match(query,/1623/);
  assert.match(query,/Bydgoszcz/);
  assert.match(query,/odmiana z kropką/);
  const url=archiveUrl(coin);
  assert.match(url,/archive\.html\?/);
  assert.match(url,/coin=coin-77/);
  assert.match(url,/q=/);
});

test('runtime loads contextual auction navigation globally',()=>{
  const app=read('app.js');
  assert.match(app,/auction-context-navigation\.js/);
  const nav=read('auction-context-navigation.js');
  assert.match(nav,/checkAuctionsForCoin/);
  assert.match(nav,/Sprawdź aukcje/);
  assert.match(nav,/coinSelect/);
  assert.match(nav,/searchBtn/);
});
