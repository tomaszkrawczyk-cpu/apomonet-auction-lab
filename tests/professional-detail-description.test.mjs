import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('Stage 2 enforces a professional auction-style description without mixing market data',()=>{
  const api=read('api/analyze-detail.js');
  assert.match(api,/STANDARD OPISU PROFESJONALNEGO/);
  assert.match(api,/emitent\/władca, nominał, rok, mennica i metal/);
  assert.match(api,/awers — co rzeczywiście widać/);
  assert.match(api,/rewers — co rzeczywiście widać/);
  assert.match(api,/cechy diagnostyczne odróżniające wariant/);
  assert.match(api,/NIE umieszczaj w fullDescription ceny, liczby notowań, mediany rynku/);
  assert.match(api,/Katalog i rzadkość mają pozostać osobnymi polami/);
  assert.match(api,/Nie przypisuj precyzyjnych stopni slabowych typu AU55\/MS63/);
  assert.match(api,/professional_auction_structured_v1/);
});

test('Kopicki requires concrete variant evidence rather than ruler-year-denomination alone',()=>{
  const api=read('api/analyze-detail.js');
  assert.match(api,/Sam władca \+ rok \+ nominał nie wystarczają/);
  assert.match(api,/Jeśli nie masz podstawy, pozostaw oba pola puste/);
  assert.match(api,/Rzadkość nie może być wnioskowana z wyglądu monety ani z przewidywanej ceny/);
});
