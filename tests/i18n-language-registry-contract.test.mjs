import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const registry=fs.readFileSync('i18n-language-registry.js','utf8');
const analysis=fs.readFileSync('analysis-content-i18n.js','utf8');
const professional=fs.readFileSync('stage2-professional-description-ui.js','utf8');

test('language registry exposes the runtime API consumed by analysis modules',()=>{
  for(const name of ['current','isEnabled','normalize','register','get','chain','resolve','languages'])assert.ok(registry.includes(name),name);
  assert.match(registry,/window\.ApoLanguageRegistry=\{register,get,isEnabled,current,chain,resolve,languages,normalize\}/);
});

test('analysis translation and professional Stage 2 can use registry as primary language source',()=>{
  assert.match(analysis,/ApoLanguageRegistry\?\.current\?\.\(\)/);
  assert.match(analysis,/registry\?\.isEnabled/);
  assert.match(professional,/ApoLanguageRegistry\?\.current\?\.\(\)/);
});
