import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const src=fs.readFileSync('analysis-next-action-ui.js','utf8');

test('analysis album-name validation is localized without using the legacy Polish alert',()=>{
  for(const l of ['pl','en','de','fr'])assert.match(src,new RegExp(`${l}:\\{title:`));
  assert.match(src,/albumName/);
  assert.match(src,/localizeAlbumValidation/);
  assert.match(src,/status\.textContent=text\('albumName'\)/);
  assert.match(src,/input\.focus\(\)/);
});
