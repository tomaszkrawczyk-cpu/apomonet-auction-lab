import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=p=>fs.readFileSync(p,'utf8');

test('AI translation runtime is wired and uses the dedicated translation endpoint',()=>{
  const app=read('app.js');
  const ui=read('analysis-ai-translation-ui.js');
  assert.match(app,/analysis-ai-translation-ui\.js/);
  assert.match(ui,/\/api\/translate-analysis/);
  assert.match(ui,/response\.clone\(\)\.json\(\)/);
});

test('translation is UI-only and does not replace the analyze API response or saved coin object',()=>{
  const ui=read('analysis-ai-translation-ui.js');
  assert.match(ui,/return response;/);
  assert.doesNotMatch(ui,/new Response\(/);
  assert.doesNotMatch(ui,/ApoMonet\.upsertCoin/);
  assert.doesNotMatch(ui,/localStorage\.setItem\([^\n]*coin/i);
});

test('stale translation responses cannot overwrite a newly selected language',()=>{
  const ui=read('analysis-ai-translation-ui.js');
  assert.match(ui,/requestedLanguage=lang\(\)/);
  assert.match(ui,/lang\(\)!==requestedLanguage/);
});

test('translation endpoint protects catalog references and transcribed legends',()=>{
  const api=read('api/translate-analysis.js');
  assert.match(api,/Preserve dates, numbers, catalog references, rarity codes, mint marks and transcribed coin legends exactly/);
  assert.match(api,/Do not add facts, explanations or corrections/);
});
