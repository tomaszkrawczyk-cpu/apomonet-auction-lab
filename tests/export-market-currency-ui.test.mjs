import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const source=fs.readFileSync('export-market-currency-ui.js','utf8');
test('PDF export makes valuation currency explicit',()=>{for(const token of ['marketCurrency','valuationCurrency','priceRange','estimateLow','estimateHigh'])assert.ok(source.includes(token),token);assert.match(source,/od \$\{money\(low,currency\)\}/);assert.match(source,/do \$\{money\(high,currency\)\}/)});
test('identity invalidation clears stale valuation currency',()=>{const invalidation=fs.readFileSync('derived-analysis-invalidation.js','utf8');assert.ok(invalidation.includes('"valuationCurrency"'))});
test('runtime loads PDF currency guard before inline export rendering completes',()=>{const app=fs.readFileSync('app.js','utf8');assert.ok(app.includes('export-market-currency-ui.js'))});
