import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const nav=fs.readFileSync('user-album-card-navigation.js','utf8');
const app=fs.readFileSync('app.js','utf8');

test('user album coin-card navigation is wired into runtime',()=>{
  assert.match(app,/user-album-card-navigation\.js/);
});

test('user album navigation targets the concrete coin record',()=>{
  assert.match(nav,/coin\.html\?id=/);
  assert.match(nav,/encodeURIComponent\(id\)/);
  assert.match(nav,/coin-pick/);
});

test('direct coin-card action is localized in all supported languages',()=>{
  for(const token of ['Otwórz kartę','Open coin card','Münzkarte öffnen','Ouvrir la fiche']) assert.match(nav,new RegExp(token));
});
