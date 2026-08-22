import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=p=>fs.readFileSync(p,'utf8');

test('market UI surfaces source verification freshness and stores re-verification count',()=>{
  const ui=read('market-valuation-hook.js');
  assert.match(ui,/sourceFreshness/);
  assert.match(ui,/auctionSourcesNeedReverification/);
  assert.match(ui,/Do ponownej weryfikacji/);
});

test('Excel export includes a dedicated source re-verification audit column',()=>{
  const xlsx=read('xlsx-sheet.js');
  assert.match(xlsx,/Źródła do ponownej weryfikacji/);
  assert.match(xlsx,/auctionSourcesNeedReverification/);
  assert.match(xlsx,/Sources needing re-verification/);
  assert.match(xlsx,/Quellen zur erneuten Prüfung/);
  assert.match(xlsx,/Sources à revérifier/);
});

test('historical source freshness remains audit metadata rather than sale validity',()=>{
  const policy=read('auction-source-quality-policy.js');
  assert.match(policy,/Historical sale facts do not expire merely because they were imported long ago/);
  assert.doesNotMatch(policy,/sourceFreshness==='stale'.*eligible/);
});
