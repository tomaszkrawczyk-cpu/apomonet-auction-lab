import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
const client=readFileSync(new URL('../catalog-candidate-enrichment.js',import.meta.url),'utf8');
const api=readFileSync(new URL('../api/catalog-candidate.js',import.meta.url),'utf8');
test('focused lookup only runs when Stage 2 lacks Kopicki',()=>{assert.match(client,/if\(clean\(detail\.kopickiReference\)\|\|clean\(detail\.catalogCandidate\?\.reference\)\)return response/);assert.match(client,/\/api\/catalog-candidate/)});
test('foreign/out-of-scope coins may return applicable false',()=>{assert.match(api,/applicable:\{type:'boolean'\}/);assert.match(api,/spoza polskiego\/ziem polskich zakresu katalogowego/)});
test('high confidence candidate may become confirmed, weaker stays candidate',()=>{assert.match(client,/Number\(candidate\.confidence\)>=88/);assert.match(client,/catalogCandidate/);assert.match(client,/Wymaga potwierdzenia/)});
