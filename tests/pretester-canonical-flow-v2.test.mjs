import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const coin=fs.readFileSync('coin.html','utf8');
const exportCurrency=fs.readFileSync('export-market-currency-ui.js','utf8');
const stage2=fs.readFileSync('stage2-literature-request.js','utf8');
const candidate=fs.readFileSync('catalog-candidate-enrichment.js','utf8');

test('base coin card no longer renders legacy catalog or album cutouts before canonical patching',()=>{
  assert.ok(!coin.includes('coin.catalog'));
  assert.ok(!coin.includes('ApoAlbumPhotos.resolve(coin'));
  assert.match(coin,/ApoCoinCardCanonical\?\.confirmedCatalog/);
  assert.match(coin,/ApoCoinPhotoIntegrity\?\.strictSource/);
});

test('export market formatting follows current language and currency',()=>{
  for(const token of ['pl-PL','en-GB','de-DE','fr-FR'])assert.ok(exportCurrency.includes(token));
  assert.match(exportCurrency,/style:'currency'/);
  assert.match(exportCurrency,/apomonet:language-change/);
  assert.match(exportCurrency,/from:'from'/);
  assert.match(exportCurrency,/from:'ab'/);
});

test('Stage 2 event detail is guarded before persistence listeners see it',()=>{
  const guard=stage2.indexOf('const d=guardDetail');
  const dispatch=stage2.indexOf("apo-stage2-detail");
  assert.ok(guard>=0&&dispatch>guard);
});

test('focused catalog candidate cannot promote itself and is tied to current completed Stage 2 identity',()=>{
  assert.match(candidate,/detailReanalysisIdentityKey!==identityKey/);
  assert.match(candidate,/catalogEvidenceStatus:detail\.catalogEvidenceStatus==='supported-by-stage2-variant-evidence'\?detail\.catalogEvidenceStatus:'unconfirmed'/);
  assert.ok(!candidate.includes("kopickiReference:reference"));
});
