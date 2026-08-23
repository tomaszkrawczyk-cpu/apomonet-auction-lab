import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
const policy=readFileSync(new URL('../auction-outlier-policy.js',import.meta.url),'utf8');
const hook=readFileSync(new URL('../auction-outlier-valuation-hook.js',import.meta.url),'utf8');
test('outlier policy uses conservative IQR filtering',()=>{assert.match(policy,/1\.5\*iqr/);assert.match(policy,/usable\.length<4/);assert.match(policy,/kept\.length<2/)});
test('outliers remain recorded but are excluded only from valuation calculations',()=>{assert.match(policy,/outliers/);assert.match(hook,/valuationRecords:rows/);assert.match(hook,/outliers/);assert.match(hook,/outlierIds/)});
test('valuation hook wraps archive valuation without deleting source facts',()=>{assert.match(hook,/baseValuation=ApoArchive\.valuation\.bind\(ApoArchive\)/);assert.match(hook,/ApoArchive\.valuation=function/);assert.doesNotMatch(hook,/ApoArchive\.remove|\.splice\(/)});
