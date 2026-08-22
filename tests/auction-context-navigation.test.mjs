import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

function helper(){
  const sandbox={console,location:{pathname:'/tests',search:''},document:{readyState:'loading',addEventListener(){}},URLSearchParams,localStorage:{getItem(){return'pl'}},addEventListener(){}};
  sandbox.window=sandbox;
  vm.runInNewContext(read('auction-context-navigation.js'),sandbox,{filename:'auction-context-navigation.js'});
  return sandbox.ApoAuctionContext;
}

test('auction link carries the concrete coin id and identification context',()=>{
  const {coinQuery,archiveUrl}=helper();
  const coin={id:'coin-77',ruler:'Zygmunt III Waza',nominal:'ort',year:'1623',mint:'Bydgoszcz',variant:'odmiana z kropką'};
  const query=coinQuery(coin);
  for(const token of ['Zygmunt III Waza','ort','1623','Bydgoszcz','odmiana z kropką'])assert.match(query,new RegExp(token));
  const url=archiveUrl(coin);
  assert.match(url,/archive\.html\?/);
  assert.match(url,/coin=coin-77/);
  assert.match(url,/q=/);
});

test('runtime loads contextual auction navigation globally and uses canonical unknown filtering',()=>{
  const app=read('app.js'),nav=read('auction-context-navigation.js');
  assert.match(app,/auction-context-navigation\.js/);
  assert.match(nav,/checkAuctionsForCoin/);
  assert.match(nav,/ApoCanonicalRecordSentinels\?\.isUnknown/);
  assert.match(nav,/coinSelect/);
  assert.match(nav,/searchBtn/);
});

test('contextual auction action and restored archive status support every application language',()=>{
  const nav=read('auction-context-navigation.js');
  for(const lang of ['pl','en','de','fr'])assert.match(nav,new RegExp(`${lang}:\\{`));
  assert.match(nav,/apomonet:language-change/);
  assert.match(nav,/t\('check'\)/);
  assert.match(nav,/t\('searching'\)/);
});
