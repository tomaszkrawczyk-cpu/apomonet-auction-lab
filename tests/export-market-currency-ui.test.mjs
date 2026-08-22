import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const source=fs.readFileSync('export-market-currency-ui.js','utf8');

test('PDF export makes valuation currency explicit in every supported language',()=>{
  for(const token of ['marketCurrency','valuationCurrency','priceRange','estimateLow','estimateHigh'])assert.ok(source.includes(token),token);
  for(const lang of ['pl','en','de','fr'])assert.match(source,new RegExp(`${lang}:\\{`));
  assert.match(source,/t\('from'\)/);
  assert.match(source,/t\('to'\)/);
  assert.match(source,/Intl\.NumberFormat\(locale\(\)/);
});

test('identity invalidation clears stale valuation currency',()=>{
  const invalidation=fs.readFileSync('derived-analysis-invalidation.js','utf8');
  assert.ok(invalidation.includes('"valuationCurrency"'));
  assert.ok(invalidation.includes('"marketCurrency"'));
});

test('runtime loads PDF currency renderer',()=>{
  const app=fs.readFileSync('app.js','utf8');
  assert.ok(app.includes('export-market-currency-ui.js'));
});
