import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
const core=readFileSync(new URL('../auction-archive-core.js',import.meta.url),'utf8');
test('matching rewards exact Kopicki and blocks conflicting Kopicki',()=>{
  assert.match(core,/reasons\.push\('Kopicki'\)/);
  assert.match(core,/if\(cRef&&rRef\)\{if\(eq\(cRef,rRef\)\)\{s\+=25/);
  assert.match(core,/else hardConflict=true/);
});
test('conflicting concrete variant is a hard conflict',()=>{
  assert.match(core,/if\(coinVariant&&rowVariant\)/);
  assert.match(core,/reasons\.push\('odmiana'\)/);
  assert.match(core,/else hardConflict=true/);
});
test('missing specific evidence cannot be strict',()=>{
  assert.match(core,/specificRequired/);
  assert.match(core,/specificMatched/);
  assert.match(core,/if\(q\.specificRequired&&!q\.specificMatched&&quality==='strict'\)quality='good'/);
});
