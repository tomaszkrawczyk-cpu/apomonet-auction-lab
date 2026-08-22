import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app=fs.readFileSync('app.js','utf8');
const removedLegacy=[
  'pretester-stability-fix.js',
  'pretester-language-sync.js',
  'album-navigation-hotfix.js',
  'calendar-target-hotfix.js',
  'coin-stage2-summary-fix.js',
  'collection-stale-valuation-guard.js',
  'analysis-canonical-sentinels.js',
  'analysis-followups.js'
];

test('obsolete all-in-one and duplicate hotfix layers are physically removed and stay out of runtime',()=>{
  for(const name of removedLegacy){
    assert.equal(fs.existsSync(name),false,name);
    assert.ok(!app.includes(name),name);
  }
});

test('canonical replacements are loaded instead',()=>{
  for(const name of [
    'canonical-record-sentinels.js',
    'analysis-resilience.js',
    'analysis-ai-translation-ui.js',
    'coin-card-canonical-fields.js',
    'collection-valuation-source.js',
    'user-album-card-navigation.js',
    'user-album-auction-context.js',
    'calendar-runtime-i18n.js'
  ])assert.ok(app.includes(name),name);
});
