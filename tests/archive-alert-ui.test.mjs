import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const ui=readFileSync(new URL('../archive-alert-ui.js',import.meta.url),'utf8');
const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');

test('archive alert UI is loaded by runtime',()=>{
  assert.match(app,/archive-alert-ui\.js/);
});

test('archive alert UI only activates on archive page',()=>{
  assert.match(ui,/location\.pathname\.endsWith\('archive\.html'\)/);
});

test('archive alert UI uses real archive facts and alert engine',()=>{
  assert.match(ui,/ApoArchive\.search\('',\{years:10\}\)/);
  assert.match(ui,/ApoAuctionAlerts\.targetsFromWatchlist\(\)/);
  assert.match(ui,/ApoAuctionAlerts\.match\(targets,lots,60\)/);
});

test('alert UI distinguishes strong and possible matches and links back to concrete coin',()=>{
  assert.match(ui,/m\.quality==='strong'/);
  assert.match(ui,/MOCNE DOPASOWANIE/);
  assert.match(ui,/MOŻLIWE DOPASOWANIE/);
  assert.match(ui,/coin\.html\?id=\$\{encodeURIComponent\(m\.coinId\)\}/);
  assert.match(ui,/Dlaczego:/);
});
