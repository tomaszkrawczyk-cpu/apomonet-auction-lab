import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const src=fs.readFileSync('export-record-view.js','utf8');

test('export never mirrors one coin side into the other',()=>{
  assert.match(src,/const originalPhoto=\(coin,side\)=>side==='obverse'\?clean\(coin\?\.obverseImage\|\|coin\?\.image\|\|coin\?\.img\):clean\(coin\?\.reverseImage\)/);
  assert.match(src,/return cut\|\|originalPhoto\(coin,side\)/);
  assert.doesNotMatch(src,/albumObverseImage\s*\|\|\s*coin\.albumReverseImage/);
  assert.doesNotMatch(src,/albumReverseImage\s*\|\|\s*coin\.albumObverseImage/);
});

test('stale export note follows the active PL EN DE FR language',()=>{
  assert.match(src,/const STALE_NOTE=\{/);
  for(const code of ['pl','en','de','fr'])assert.match(src,new RegExp(`${code}:["']`));
  assert.match(src,/STALE_NOTE\[lang\(\)\]/);
});
