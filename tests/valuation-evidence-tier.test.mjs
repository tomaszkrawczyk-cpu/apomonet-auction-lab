import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
const core=readFileSync(new URL('../auction-archive-core.js',import.meta.url),'utf8');
test('valuation prefers strict same-condition records when enough exist',()=>{assert.match(core,/strictCondition\.length>=2/);assert.match(core,/rows:strictCondition,tier:'strict-condition'/)});
test('valuation widens conservatively to nearby condition or strict identity evidence',()=>{assert.match(core,/nearCondition/);assert.match(core,/r\.similarity>=82/);assert.match(core,/tier:'near-condition'/);assert.match(core,/strictAll/);assert.match(core,/r\.similarity>=88/)});
test('weak evidence cannot produce a price range',()=>{assert.match(core,/if\(chosen\.rows\.length<2\)/);assert.match(core,/canEstimate:false/);assert.match(core,/priceRange:''/)});
