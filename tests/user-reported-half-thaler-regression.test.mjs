import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read=path=>fs.readFileSync(path,'utf8');

test('ASCII Polish denomination is normalized and suggested as Półtalar',()=>{
  const sandbox={window:{}};
  vm.runInNewContext(read('numismatic-core.js'),sandbox,{filename:'numismatic-core.js'});
  assert.equal(sandbox.window.ApoNumis.canonicalDenomination('poltalar'),'Półtalar');
  assert.equal(sandbox.window.ApoNumis.canonicalDenomination('PÓŁTALAR'),'Półtalar');
  assert.ok(sandbox.window.ApoNumis.denominationSuggestions('polta').includes('Półtalar'));
});

test('inline correction selects the whole field and exposes denomination suggestions',()=>{
  const source=read('analysis-inline-correction.js');
  assert.match(source,/input\.select\(\)/);
  assert.match(source,/apoNominalSuggestions/);
  assert.match(source,/denominationSuggestions/);
  assert.match(source,/canonicalDenomination/);
});

test('accepted cutouts are the canonical display source on the saved coin card',()=>{
  const integrity=read('coin-photo-side-integrity.js');
  const page=read('coin.html');
  assert.match(integrity,/ApoAlbumPhotos\?\.resolve/);
  assert.match(page,/ApoAlbumPhotos\?\.resolve/);
  assert.match(page,/sourcesCard/);
});

test('background review allows choosing the better cutout independently for each side',()=>{
  const prep=read('album-photo-prep.js');
  const guard=read('album-photo-side-integrity.js');
  for(const token of ['acceptObverse','acceptReverse','obverseMode','reverseMode'])assert.ok(prep.includes(token),token);
  assert.match(guard,/albumObversePhotoMode/);
  assert.match(guard,/albumReversePhotoMode/);
});

test('Stage 2 must report initials and price-critical marks instead of silently omitting them',()=>{
  const api=read('api/analyze-detail.js');
  const ui=read('stage2-professional-description-ui.js');
  for(const token of ['INICJAŁY I ZNAKI','I–I','initialsAndMarks','priceCriticalFeatures','initialsPattern'])assert.ok(api.includes(token),token);
  assert.match(ui,/initialsAndMarks/);
  assert.match(ui,/priceCriticalFeatures/);
});

test('Coinstrail is retained as a reference-only owner link and never sent to the WCN importer',()=>{
  const importer=read('wcn-batch-import.js');
  assert.match(importer,/isCoinstrailReference/);
  assert.match(importer,/mode:'reference_only'/);
  assert.match(importer,/noImportedContent:true/);
  assert.match(importer,/const nonWcn=urls\.filter\(url=>!isWcnRecord\(url\)\)/);
});

test('detailed analysis uses a stable job id and reports measured server duration',()=>{
  const page=read('analyze.html');
  assert.match(page,/X-Apo-Job-Id/);
  assert.match(page,/apo-detail-/);
  assert.match(page,/d\.meta\?\.elapsedMs/);
});

test('coin card language change covers photos, actions and AI status',()=>{
  const card=read('coin-card-finish.js');
  for(const token of ['missingObverse','missingReverse','collectionLink','another','badge.textContent=tx.ai'])assert.ok(card.includes(token),token);
  assert.match(card,/const rerender=\(\)=>render\(\)\.then\(localizeStatic\)/);
});
