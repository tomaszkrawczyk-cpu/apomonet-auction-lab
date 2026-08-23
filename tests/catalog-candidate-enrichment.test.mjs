import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
const client=readFileSync(new URL('../catalog-candidate-enrichment.js',import.meta.url),'utf8');
const api=readFileSync(new URL('../api/health.js',import.meta.url),'utf8');
test('focused lookup only runs when Stage 2 lacks Kopicki',()=>{assert.match(client,/if\(clean\(detail\.kopickiReference\)\|\|clean\(detail\.catalogCandidate\?\.reference\)\)return response/);assert.match(client,/\/api\/health/);assert.match(client,/mode:'catalog-candidate'/)});
test('foreign or out-of-scope coins may return applicable false',()=>{assert.match(api,/applicable:\{type:'boolean'\}/);assert.match(api,/spoza polskiego\/ziem polskich zakresu katalogowego/)});
test('focused lookup always stays a candidate until the deterministic Stage 2 gate confirms it',()=>{assert.match(client,/catalogCandidate/);assert.match(client,/must never self-promote it to confirmed literature/);assert.match(client,/Wymaga potwierdzenia/)});
test('health GET remains available while catalog uses POST mode',()=>{assert.match(api,/req\.method==='POST'/);assert.match(api,/body\.mode!=='catalog-candidate'/);assert.match(api,/req\.method!=='GET'/)});
