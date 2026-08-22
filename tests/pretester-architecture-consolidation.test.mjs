import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=p=>fs.readFileSync(p,'utf8');

test('obsolete collection valuation override is not loaded at runtime',()=>{
  const app=read('app.js');
  assert.ok(!app.includes('collection-stale-valuation-guard.js'));
  assert.ok(app.includes('collection-valuation-source.js'));
});

test('home dashboard owns multilingual dynamic rendering and locale-aware money',()=>{
  const src=read('home-dashboard-summary.js');
  for(const lang of ['pl','en','de','fr'])assert.match(src,new RegExp(`${lang}:\\{`));
  assert.match(src,/apomonet:language-change/);
  assert.match(src,/Intl\.NumberFormat\(locale\(\)/);
});

test('coin card uses original record photos while album and export may use prepared cutouts',()=>{
  const card=read('coin-photo-side-integrity.js');
  const album=read('user-album-photo-pair.js');
  const exp=read('export-record-view.js');
  assert.ok(!card.includes("albumPhotoMode==='cut'"));
  assert.match(card,/coin\.obverseImage/);
  assert.match(card,/coin\.reverseImage/);
  assert.match(album,/albumPhotoMode==='cut'/);
  assert.match(exp,/albumPhotoMode==='cut'/);
});

test('retake invalidates prepared cutouts and old analysis images',()=>{
  const retake=read('analysis-album-save-fix.js');
  assert.match(retake,/delete next\.analysisImgs/);
  assert.match(retake,/albumPhotoMode:'original'/);
  assert.match(retake,/albumPhotoInvalidatedByRetake:true/);
});

test('resolved reanalysis requires current market identity as well as current Stage 2 identity',()=>{
  const resolution=read('correction-reanalysis-resolution.js');
  const migration=read('legacy-record-migration.js');
  assert.match(resolution,/auctionMarketIdentityKey===current/);
  assert.match(migration,/auctionMarketIdentityKey===current/);
});

test('stale export scrubs legacy market fallbacks and prior completion markers',()=>{
  const exp=read('export-record-view.js');
  for(const field of ['priceEstimate','estimate','valuationCurrency','auctionMarketIdentityKey','marketReanalysisCompletedAt'])assert.ok(exp.includes(`'${field}'`),field);
});
