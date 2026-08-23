import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
const grades=readFileSync(new URL('../grade-band-core.js',import.meta.url),'utf8');
const core=readFileSync(new URL('../auction-archive-core.js',import.meta.url),'utf8');
test('condition normalizer stays broad and conservative',()=>{assert.match(grades,/F:1,VF:2,XF:3,AU:4/);assert.doesNotMatch(grades,/MS6[0-9]|AU5[0-9]/)});
test('same condition is preferred and distant condition is penalized',()=>{assert.match(core,/conditionDistance===0/);assert.match(core,/conditionDistance!=null&&conditionDistance>=2/);assert.match(core,/s-=15/)});
test('valuation requires same or neighboring condition when coin condition is known',()=>{assert.match(core,/strictCondition\.length>=2/);assert.match(core,/conditionDistance==null\|\|r\.conditionDistance<=1/);assert.match(core,/insufficient-condition-evidence/)});
