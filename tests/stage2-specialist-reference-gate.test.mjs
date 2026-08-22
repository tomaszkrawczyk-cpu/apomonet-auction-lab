import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const src=fs.readFileSync('stage2-literature-request.js','utf8');

test('generic add helper refuses unconfirmed Kopicki',()=>{
  assert.match(src,/if\(key==='kopicki'&&d\.catalogEvidenceStatus!=='supported-by-stage2-variant-evidence'\)return/);
});

test('specialistReferences loop cannot bypass Kopicki evidence status',()=>{
  assert.match(src,/if\(key==='kopicki'&&d\.catalogEvidenceStatus!=='supported-by-stage2-variant-evidence'\)continue/);
});

test('confirmed Kopicki still requires deterministic Stage 2 evidence',()=>{
  assert.match(src,/confidence>=80&&\(diagnostics\.length>=2\|\|fingerprintStrong>=3\)/);
  assert.match(src,/d\.catalogEvidenceStatus==='supported-by-stage2-variant-evidence'/);
});
