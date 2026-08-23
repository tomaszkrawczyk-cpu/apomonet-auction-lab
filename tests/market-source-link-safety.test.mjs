import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const src=fs.readFileSync('market-valuation-hook.js','utf8');

test('analysis market source links are escaped and limited to HTTP(S)',()=>{
  assert.match(src,/safeUrl=/);
  assert.match(src,/\^https\?:\$/);
  assert.match(src,/rel="noopener noreferrer"/);
  assert.match(src,/const href=safeUrl\(r\.sourceUrl\)/);
});

test('dynamic market evidence labels are localized',()=>{
  for(const l of ['pl','en','de','fr'])assert.match(src,new RegExp(`${l}:\\{title:`));
  assert.match(src,/d\.match/);
  assert.match(src,/d\.source/);
});
