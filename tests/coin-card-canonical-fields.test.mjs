import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const app=fs.readFileSync('app.js','utf8');
const src=fs.readFileSync('coin-card-canonical-fields.js','utf8');
test('canonical coin card layer is loaded after side integrity',()=>{
  const integrity=app.indexOf('coin-photo-side-integrity.js');
  const canonical=app.indexOf('coin-card-canonical-fields.js');
  assert.ok(integrity>=0&&canonical>integrity);
});
test('coin card only exposes confirmed fresh catalog references',()=>{
  assert.match(src,/derivedDataStale\|\|c\?\.needsReanalysis/);
  assert.match(src,/supported-by-stage2-variant-evidence/);
  assert.match(src,/verified-curated/);
  assert.doesNotMatch(src,/coin\.catalog/);
});
test('async translation rerenders are observed without blind render loops',()=>{
  assert.match(src,/new MutationObserver/);
  assert.match(src,/catalogNow/);
  assert.match(src,/queueMicrotask\(apply\)/);
  assert.match(src,/applying/);
});
