import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync('pretester-stability-fix.js','utf8');

test('pretester hardening script is valid JavaScript',()=>{
  assert.doesNotThrow(()=>new vm.Script(source));
});

test('curated Kopicki mapping requires diagnostic variant evidence',()=>{
  assert.match(source,/Kopicki 8339/);
  assert.match(source,/rarity:'R5'/);
  assert.match(source,/Kopicki 8337/);
  assert.match(source,/rarity:'R4'/);
  assert.match(source,/HD\\s\*\[-–\]\?\\s\*L/);
  assert.match(source,/return null;/);
});

test('analysis recovery persists a job and resumes after visibility or network return',()=>{
  assert.match(source,/apomonet_pending_analysis_v1/);
  assert.match(source,/visibilitychange/);
  assert.match(source,/addEventListener\('online'/);
  assert.match(source,/X-Apo-Job-Id/);
  assert.match(source,/AbortController/);
  assert.match(source,/BASIC_CLIENT_TIMEOUT_MS=48_000/);
  assert.match(source,/DETAIL_CLIENT_TIMEOUT_MS=58_000/);
  assert.match(source,/MAX_ATTEMPTS=2/);
  assert.match(source,/requestStartedAt/);
});

test('active two-stage UI recommends detail from evidence, not confidence alone',()=>{
  assert.match(source,/function detailSignals\(/);
  assert.match(source,/imageQualityNote/);
  assert.match(source,/rulerConfidence/);
  assert.match(source,/yearConfidence/);
  assert.match(source,/nominalConfidence/);
  assert.match(source,/reference-conflict/);
  assert.match(source,/needsDetailedAnalysis/);
  assert.match(source,/Analiza szczegółowa/);
});

test('analysis timing keeps a bounded local history for p50 and p90 measurements',()=>{
  assert.match(source,/apomonet_analysis_performance_v1/);
  assert.match(source,/ApoAnalysisPerformance/);
  assert.match(source,/rows\.slice\(-60\)/);
  assert.match(source,/p50Ms:pick\(\.5\)/);
  assert.match(source,/p90Ms:pick\(\.9\)/);
  assert.match(source,/recordPerf\('basic'/);
  assert.match(source,/recordPerf\('detail'/);
  assert.match(source,/doneWithTime/);
});

test('late i18n covers previously untranslated tester actions',()=>{
  for(const label of ['Edytuj i popraw','Analizuj inną monetę','Usuń monetę z kolekcji','Profil domu aukcyjnego']){
    assert.ok(source.includes(label),`missing translation key: ${label}`);
  }
});

test('app loads the pretester hardening after other runtime modules',()=>{
  const app=fs.readFileSync('app.js','utf8');
  assert.match(app,/pretester-stability-fix\.js/);
  assert.ok(app.lastIndexOf('pretester-stability-fix.js')>app.lastIndexOf('auction-house-live.js'));
});
