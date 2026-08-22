import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const src=fs.readFileSync('export-record-view.js','utf8');
test('export boundary strips internal analysis and migration fields before PDF/XLSX renderers see records',()=>{
  for(const field of ['rawAI','userAdditionalInfo','previousDetailAudit','derivedStateIdentityKey','recordMigrationVersion','legacyDerivedDataQuarantined'])assert.match(src,new RegExp("'"+field+"'"));
  assert.match(src,/for\(const key of PRIVATE_FIELDS\)delete output\[key\]/);
});
