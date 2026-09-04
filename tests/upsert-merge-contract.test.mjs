import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const core=fs.readFileSync('app-core.js','utf8');
const drift=fs.readFileSync('resolved-identity-drift-guard.js','utf8');
test('core upsert merges partial patches into existing coin records',()=>{
  assert.match(core,/requestedId=String\(c\?\.id\|\|''\)\.trim\(\)/);
  assert.match(core,/old=requestedId\?s\.coins\.find/);
  assert.match(core,/item=\{\.\.\.\(old\|\|\{\}\),\.\.\.c,id:requestedId\|\|uid\('coin'\)/);
});
test('outer drift guard merges current record before invalidation',()=>{
  assert.match(drift,/const current=patch\?\.id\?ApoMonet\.getCoin\(patch\.id\):null/);
  assert.match(drift,/const merged=current\?\{\.\.\.current,\.\.\.patch\}:patch/);
});
