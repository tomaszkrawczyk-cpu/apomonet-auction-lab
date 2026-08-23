import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const src=fs.readFileSync('i18n-market-valuation.js','utf8');

test('market i18n localizes dynamic text and placeholders without mutation loops',()=>{
  assert.match(src,/placeholderOriginals/);
  assert.match(src,/MutationObserver/);
  assert.match(src,/if\(n\.nodeValue!==next\)n\.nodeValue=next/);
  assert.match(src,/if\(el\.placeholder!==next\)el\.placeholder=next/);
  for(const phrase of ['Fakt cenowy zapisany lokalnie.','Brak źródłowych rekordów pasujących do zapytania. APOMONET nie uzupełnia braków wymyślonymi wynikami.','Dom aukcyjny / źródło','Link do publicznego źródła'])assert.ok(src.includes(phrase),phrase);
});
