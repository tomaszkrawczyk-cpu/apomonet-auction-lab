import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=p=>fs.readFileSync(p,'utf8');

test('export runtime actually loads record normalization and export i18n',()=>{
  const app=read('app.js');
  assert.match(app,/export-record-view\.js/);
  assert.match(app,/export-i18n\.js/);
});

test('export audit field and note are translated in all supported base languages',()=>{
  const i18n=read('export-i18n.js');
  for(const token of ['reverify:','audit:n=>','Sources requiring reverification','Erneut zu prüfende Quellen','Sources à revérifier'])assert.ok(i18n.includes(token),token);
  assert.match(i18n,/const market=\['valuation','auction','reverify'\]/);
  assert.match(i18n,/querySelector\('\.audit-note'\)/);
});

test('export record normalization still uses confirmed detail and never rawAI',()=>{
  const view=read('export-record-view.js');
  assert.match(view,/detail\.fullDescription/);
  assert.doesNotMatch(view,/rawAI/);
});
