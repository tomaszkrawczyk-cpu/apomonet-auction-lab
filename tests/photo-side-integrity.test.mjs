import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const queue=fs.readFileSync('analysis-photo-side-queue.js','utf8');
const card=fs.readFileSync('coin-photo-side-integrity.js','utf8');
const app=fs.readFileSync('app.js','utf8');

test('photo processing is serialized independently for obverse and reverse',()=>{
  assert.match(queue,/const tails=\[Promise\.resolve\(\),Promise\.resolve\(\)\]/);
  assert.match(queue,/obverseInput/);
  assert.match(queue,/reverseInput/);
  assert.match(queue,/tails\[side\]/);
  assert.ok(app.indexOf('analysis-image-pipeline.js')<app.indexOf('analysis-photo-side-queue.js'));
});

test('photo side swap is disabled once Stage 1 result is visible',()=>{
  assert.match(queue,/analysisVisible/);
  assert.match(queue,/stopImmediatePropagation/);
  assert.match(queue,/swap\.classList\.add\('hidden'\)/);
  assert.match(queue,/swap\.disabled=true/);
});

test('coin card never substitutes the opposite side for a missing photo',()=>{
  assert.match(card,/side==='obverse'\?\(coin\.obverseImage\|\|coin\.image\|\|coin\.img\):coin\.reverseImage/);
  assert.doesNotMatch(card,/coin\.obverseImage\s*\|\|\s*coin\.reverseImage/);
  assert.doesNotMatch(card,/coin\.reverseImage\s*\|\|\s*coin\.obverseImage/);
  assert.match(card,/image\.hidden=true;empty\.hidden=false/);
  assert.ok(app.includes('coin-photo-side-integrity.js'));
});
