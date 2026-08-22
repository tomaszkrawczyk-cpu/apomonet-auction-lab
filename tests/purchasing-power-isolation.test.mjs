import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
const pp=readFileSync(new URL('../auction-purchasing-power.js',import.meta.url),'utf8');
const ui=readFileSync(new URL('../auction-record-cost-ui.js',import.meta.url),'utf8');
const archive=readFileSync(new URL('../auction-archive-core.js',import.meta.url),'utf8');
test('purchasing power requires explicit factor provenance',()=>{assert.match(pp,/inflationFactorToPresent/);assert.match(pp,/inflationSource/);assert.match(pp,/inflationReferenceDate/)});
test('purchasing power is presented as context only',()=>{assert.match(ui,/To tylko kontekst ekonomiczny i nie wpływa na wycenę monety/)});
test('core valuation does not use purchasing power factors',()=>{assert.doesNotMatch(archive,/inflationFactorToPresent|purchasingPower|presentValue/)});
