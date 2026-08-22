import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const stage2=fs.readFileSync('stage2-literature-request.js','utf8');
const candidate=fs.readFileSync('catalog-candidate-enrichment.js','utf8');
const app=fs.readFileSync('app.js','utf8');

test('Stage 2 persistence event is built from accepted-identity and catalog guarded detail',()=>{
  assert.match(stage2,/guardDetail\(data\?\.detail\|\|\{\}\)/);
  assert.match(stage2,/ApoDerivedInvalidation\.protectAcceptedDetail/);
  assert.match(stage2,/ApoDerivedInvalidation\.gateCatalogEvidence/);
  const guarded=stage2.indexOf("const d=guardDetail");
  const event=stage2.indexOf("apo-stage2-detail");
  assert.ok(guarded>=0&&event>guarded);
});

test('the same guarded Stage 2 detail is returned to the main analysis UI',()=>{
  assert.match(stage2,/responseWithDetail/);
  assert.match(stage2,/return responseWithDetail\(response,data,d\)/);
  assert.match(stage2,/JSON\.stringify\(\{\.\.\.data,detail\}\)/);
});

test('focused catalog candidate persists only onto a completed current Stage 2 identity',()=>{
  assert.match(candidate,/detailReanalysisIdentityKey!==identityKey/);
  assert.match(candidate,/detailReanalysisCompletedAt/);
  assert.match(candidate,/catalogCandidate:nextCandidate/);
  assert.match(candidate,/catalogEvidenceStatus:detail\.catalogEvidenceStatus==='supported-by-stage2-variant-evidence'\?detail\.catalogEvidenceStatus:'unconfirmed'/);
});

test('focused catalog pass runs only for the exact Stage 2 endpoint',()=>{
  assert.match(candidate,/requestPath/);
  assert.match(candidate,/requestPath\(input\)!=='\/api\/analyze-detail'/);
  assert.doesNotMatch(candidate,/String\(input\|\|''\)\.includes\('\/api\/analyze-detail'\)/);
});

test('candidate persistence may occur while market refresh is still pending',()=>{
  assert.ok(!/coin\.derivedDataStale\|\|coin\.needsReanalysis/.test(candidate));
});

test('runtime loads Stage 2 request before persistence listener and market refresh remains separately gated',()=>{
  const request=app.indexOf('stage2-literature-request.js');
  const persist=app.indexOf('stage2-literature-persist.js');
  const market=app.indexOf('market-reanalysis-refresh.js');
  assert.ok(request>=0&&persist>request&&market>persist);
});
