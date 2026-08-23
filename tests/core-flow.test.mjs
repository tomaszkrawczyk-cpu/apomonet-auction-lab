import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=p=>fs.readFileSync(p,'utf8');

test('runtime keeps the canonical image, valuation and correction layers loaded',()=>{
  const app=read('app.js');
  for(const file of [
    'analysis-image-pipeline.js',
    'analysis-photo-side-queue.js',
    'analysis-album-save-fix.js',
    'coin-photo-side-integrity.js',
    'coin-card-canonical-fields.js',
    'collection-valuation-source.js',
    'derived-analysis-invalidation.js',
    'correction-reanalysis-resolution.js',
    'resolved-identity-drift-guard.js',
    'legacy-record-migration.js',
  ]) assert.ok(app.includes(file),file);
  assert.ok(!app.includes('collection-stale-valuation-guard.js'));
});

test('Stage 1 requires two bounded images and exposes structured confidence',()=>{
  const api=read('api/analyze.js');
  assert.match(api,/images\.length < 2/);
  assert.match(api,/image\.length > 1_800_000/);
  assert.match(api,/confidence: \{ type: "integer", minimum: 0, maximum: 95 \}/);
  assert.match(api,/needsDetailedAnalysis/);
  assert.match(api,/BASIC_TIMEOUT_MS = 45_000/);
});

test('Stage 2 stays bounded and receives a canonical base rather than saved photos',()=>{
  const api=read('api/analyze-detail.js');
  const page=read('analyze.html');
  assert.match(api,/DETAIL_TIMEOUT_MS = 55_000/);
  assert.match(api,/const BASE_FIELDS = \[/);
  assert.doesNotMatch(api,/BASE_FIELDS = \[[\s\S]*?obverseImage/);
  assert.doesNotMatch(api,/BASE_FIELDS = \[[\s\S]*?reverseImage/);
  assert.match(page,/images: analysisImgs, base: detailBase\(\)/);
});

test('accepted corrections preserve raw AI and trigger derived-data revalidation',()=>{
  const inline=read('analysis-inline-correction.js');
  const invalidation=read('derived-analysis-invalidation.js');
  assert.match(inline,/rawAI/);
  assert.match(inline,/userAccepted\s*=\s*true/);
  assert.match(invalidation,/needsReanalysis/);
  for(const field of ['marketMedian','estimatedPrice','priceEstimate','valuation','marketValue'])assert.ok(invalidation.includes(field),field);
});

test('a retake preserves the analysis record while invalidating old prepared and analysis images',()=>{
  const retake=read('analysis-album-save-fix.js');
  assert.match(retake,/delete next\.analysisImgs/);
  assert.match(retake,/albumPhotoMode:'original'/);
  assert.match(retake,/albumPhotoInvalidatedByRetake:true/);
  assert.match(retake,/imgs,photoDiagnostics/);
});

test('coin card is documentary: original images and confirmed catalog evidence only',()=>{
  const page=read('coin.html');
  const canonical=read('coin-card-canonical-fields.js');
  const photo=read('coin-photo-side-integrity.js');
  assert.match(page,/coin\.obverseImage/);
  assert.match(page,/coin\.reverseImage/);
  assert.doesNotMatch(page,/ApoAlbumPhotos\.resolve\(coin/);
  assert.match(canonical,/supported-by-stage2-variant-evidence/);
  assert.match(canonical,/kopickiReference/);
  assert.ok(!photo.includes("albumPhotoMode==='cut'"));
});

test('album and export may use accepted prepared cutouts without changing the coin card originals',()=>{
  const album=read('user-album-photo-pair.js');
  const exp=read('export-record-view.js');
  assert.match(album,/albumPhotoMode==='cut'/);
  assert.match(exp,/albumPhotoMode==='cut'/);
  assert.match(album,/ApoAlbumPhotos\.resolve/);
});

test('resolved reanalysis binds Stage 2 and market to the same current identity',()=>{
  const resolution=read('correction-reanalysis-resolution.js');
  const market=read('market-reanalysis-refresh.js');
  assert.match(resolution,/detailReanalysisIdentityKey===current/);
  assert.match(resolution,/auctionMarketIdentityKey===current/);
  assert.match(market,/detailReanalysisIdentityKey!==identityKey/);
  assert.match(market,/auctionMarketIdentityKey:identityKey/);
});

test('collection and exports share canonical valuation semantics and preserve currency',()=>{
  const valuation=read('collection-valuation-source.js');
  const xlsx=read('xlsx-sheet-canonical.js');
  const exp=read('export-market-currency-ui.js');
  assert.match(valuation,/marketMedian/);
  assert.match(valuation,/marketCurrency/);
  assert.match(xlsx,/marketMedian/);
  assert.match(exp,/marketCurrency/);
  assert.match(exp,/valuationCurrency/);
  assert.doesNotMatch(valuation,/\bcoin\?\.value\b/);
});

test('translation clients do not send private owner notes or coin photos for text localization',()=>{
  const analysis=read('analysis-content-i18n.js');
  const collection=read('collection-content-i18n.js');
  const api=read('api/translate-analysis.js');
  for(const src of [analysis,collection,api]) assert.doesNotMatch(src,/userAdditionalInfo|provenance/);
  assert.doesNotMatch(analysis,/obverseImage|reverseImage/);
  assert.doesNotMatch(collection,/obverseImage|reverseImage|rawAI|notes/);
  assert.doesNotMatch(api,/obverseImage|reverseImage/);
});

test('album domain rejects orphan target IDs before removing the source assignment',()=>{
  const guard=read('album-domain-integrity.js');
  const app=read('app.js');
  assert.ok(app.includes('album-domain-integrity.js'));
  assert.match(guard,/const exists=\(state,id\)=>/);
  assert.match(guard,/if\(!to\|\|!exists\(state,to\)\)return null/);
  assert.match(guard,/if\(from&&from===to\)return ApoMonet\.getCoin/);
});

test('legacy corrected records migrate conservatively and migration is versioned',()=>{
  const migration=read('legacy-record-migration.js');
  assert.match(migration,/recordMigrationVersion/);
  assert.match(migration,/reanalysisResolved/);
  assert.match(migration,/legacyDerivedDataQuarantined/);
  assert.match(migration,/auctionMarketIdentityKey===current/);
});
