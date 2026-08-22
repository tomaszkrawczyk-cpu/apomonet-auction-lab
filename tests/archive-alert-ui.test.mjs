import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const ui=readFileSync(new URL('../archive-alert-ui.js',import.meta.url),'utf8');
const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');

test('archive alert UI is loaded by runtime after target purchase flow',()=>{
  assert.match(app,/archive-alert-ui\.js/);
  assert.ok(app.indexOf('target-purchase-flow.js')<app.indexOf('archive-alert-ui.js'));
});

test('archive alert UI only activates on archive page',()=>{
  assert.match(ui,/location\.pathname\.endsWith\('archive\.html'\)/);
});

test('archive alert UI uses real archive facts and alert engine',()=>{
  assert.match(ui,/ApoArchive\.search\('',\{years:10\}\)/);
  assert.match(ui,/ApoAuctionAlerts\.targetsFromWatchlist\(\)/);
  assert.match(ui,/ApoAuctionAlerts\.match\(targets,lots,60\)/);
});

test('alert UI consumes canonical matchStrength and matchReasons fields',()=>{
  assert.match(ui,/m\.matchStrength==='strong'/);
  assert.match(ui,/m\.matchReasons/);
  assert.doesNotMatch(ui,/m\.quality==='strong'/);
  assert.match(ui,/coin\.html\?id=\$\{encodeURIComponent\(m\.coinId\)\}/);
});

test('archive alerts and purchase action support all application languages',()=>{
  for(const lang of ['pl','en','de','fr'])assert.match(ui,new RegExp(`${lang}:\\{`));
  assert.match(ui,/apomonet:language-change/);
  assert.match(ui,/ApoTargetPurchase\.completePurchase/);
  assert.match(ui,/purchase/i);
});
