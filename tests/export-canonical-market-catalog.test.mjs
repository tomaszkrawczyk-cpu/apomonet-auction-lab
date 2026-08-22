import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const app=fs.readFileSync('app.js','utf8');
const market=fs.readFileSync('export-market-currency-ui.js','utf8');
const xlsx=fs.readFileSync('xlsx-sheet-canonical.js','utf8');
test('export display prefers market median over legacy estimated price',()=>{assert.match(market,/coin\.marketMedian\?\?coin\.estimatedPrice/)});
test('canonical XLSX layer loads before package builder',()=>{const a=app.indexOf('xlsx-sheet.js'),b=app.indexOf('xlsx-sheet-canonical.js'),c=app.indexOf('xlsx-package.js');assert.ok(a>=0&&b>a&&c>b)});
test('canonical XLSX layer prefers market median and never promotes general rarity to confirmed Kopicki rarity',()=>{assert.match(xlsx,/out\.estimatedPrice=c\.marketMedian/);assert.match(xlsx,/out\.rarity=''/);assert.match(xlsx,/kopickiRarity/)});
