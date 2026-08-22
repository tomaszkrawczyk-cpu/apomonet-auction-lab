import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const backup=fs.readFileSync('backup-integrity.js','utf8');
const market=fs.readFileSync('i18n-market-valuation.js','utf8');

test('backup language validation follows the runtime language registry while other preferences stay closed',()=>{
  assert.match(backup,/ApoLanguageRegistry/);
  assert.match(backup,/isEnabled/);
  assert.match(backup,/FALLBACK_LANGUAGES/);
  assert.match(backup,/apomonet_collection_view_v1:new Set\(\['grid','list'\]\)/);
  assert.match(backup,/apomonet_collection_sort_v1:new Set\(\['added-desc','year-asc','year-desc','nominal-desc','nominal-asc'\]\)/);
});

test('market archive localization covers dynamic statuses and form placeholders without obsolete registry API',()=>{
  for(const phrase of ['Brakuje źródła, daty sprzedaży, poprawnej ceny młotkowej lub waluty.','Fakt cenowy zapisany lokalnie.','Dom aukcyjny / źródło','Link do publicznego źródła'])assert.ok(market.includes(phrase),phrase);
  assert.match(market,/placeholderOriginals/);
  assert.match(market,/input\[placeholder\],textarea\[placeholder\]/);
  assert.match(market,/ApoLanguageRegistry\?\.current/);
  assert.doesNotMatch(market,/ApoLanguageRegistry.*translate/);
});
