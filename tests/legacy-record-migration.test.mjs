import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const src=fs.readFileSync('legacy-record-migration.js','utf8');
const app=fs.readFileSync('app.js','utf8');
test('legacy migration runs after current invalidation and drift guards',()=>{
  const derived=app.indexOf('derived-analysis-invalidation.js'),drift=app.indexOf('resolved-identity-drift-guard.js'),migration=app.indexOf('legacy-record-migration.js');
  assert.ok(derived>=0&&drift>derived&&migration>drift);
});
test('migration only quarantines corrected records that still carry legacy derived data',()=>{
  assert.match(src,/userAccepted/);assert.match(src,/rawAI/);assert.match(src,/hasLegacyDerived/);assert.match(src,/ApoDerivedInvalidation\?\.invalidate/);assert.match(src,/legacyDerivedDataQuarantined=true/);
});
test('migration is versioned and therefore idempotent',()=>{assert.match(src,/recordMigrationVersion/);assert.match(src,/VERSION=1/);assert.match(src,/>=VERSION/)});
