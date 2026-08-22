import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=p=>fs.readFileSync(p,'utf8');

test('record persistence and Stage 2 share the canonical Nie ustalono sentinel',()=>{
  const persist=read('canonical-record-sentinels.js');
  const stage2=read('stage2-literature-request.js');
  for(const source of [persist,stage2]){
    assert.match(source,/unknown/);
    assert.match(source,/unbekannt/);
    assert.match(source,/inconnu/);
    assert.match(source,/do\\s\+potwierdzenia/);
    assert.match(source,/Nie ustalono/);
  }
});

test('Stage 2 canonicalizes identity fields before literature policy and request body',()=>{
  const stage2=read('stage2-literature-request.js');
  assert.match(stage2,/for\(const k of \['country','ruler','year','nominal','mint','metal','variant'\]\)/);
  assert.match(stage2,/const base=canonicalBase\(body\?\.base\|\|\{\}\)/);
  assert.match(stage2,/select\?\.\(base\)/);
  assert.match(stage2,/const next=\{\.\.\.body,base,literaturePolicy:policy,stage2Explicit:true\}/);
});

test('free text owner information is not canonicalized as an identity field',()=>{
  const stage2=read('stage2-literature-request.js');
  assert.doesNotMatch(stage2,/canonical\(base\.userAdditionalInfo\)/);
  assert.doesNotMatch(stage2,/['"]userAdditionalInfo['"].*canonical/);
});
