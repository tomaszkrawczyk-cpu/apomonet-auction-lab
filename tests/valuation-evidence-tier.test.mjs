import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
const core=readFileSync(new URL('../auction-archive-core.js',import.meta.url),'utf8');
test('valuation prefers strict records when enough exist',()=>{
  assert.match(core,/strict\.length>=2/);
  assert.match(core,/rows:strict,tier:'strict'/);
});
test('valuation may widen only to good evidence, never indicative evidence',()=>{
  assert.match(core,/r\.quality==='strict'\|\|r\.quality==='good'/);
  assert.match(core,/tier:'strict\+good'/);
  assert.doesNotMatch(core,/valuationRows[\s\S]*quality==='indicative'/);
});
test('weak evidence cannot produce price range',()=>{
  assert.match(core,/chosen\.tier==='strict'\?'strong':chosen\.tier==='strict\+good'\?'usable':'limited'/);
  assert.match(core,/if\(s\.quality==='limited'\)return\{\.\.\.s,canEstimate:false/);
});
