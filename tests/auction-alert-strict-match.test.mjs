import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const source=readFileSync(new URL('../auction-alerts-core.js',import.meta.url),'utf8');

test('known mint and variant conflicts reduce the score',()=>{
  assert.match(source,/s-=25;reasons\.push\('mint-conflict'\)/);
  assert.match(source,/s-=30;reasons\.push\('variant-conflict'\)/);
});

test('core identity conflicts are heavily penalized',()=>{
  assert.match(source,/s-=35;reasons\.push\('ruler-conflict'\)/);
  assert.match(source,/s-=45;reasons\.push\('year-conflict'\)/);
  assert.match(source,/s-=40;reasons\.push\('nominal-conflict'\)/);
});

test('strict targets require compatible mint and variant before alerting',()=>{
  assert.match(source,/const strict=Boolean\(n\(t\.mint\)\|\|n\(t\.variant\)\)/);
  assert.match(source,/const variantOk=!variantRequired\|\|same\(t\.variant,l\.variant\)/);
  assert.match(source,/const mintOk=!mintRequired\|\|!n\(l\.mint\)\|\|same\(t\.mint,l\.mint\)/);
  assert.match(source,/detail\.score>=threshold&&detail\.coreOk&&detail\.variantOk&&detail\.mintOk/);
});

test('strict alerts use a higher minimum and expose explanation metadata',()=>{
  assert.match(source,/const threshold=detail\.strict\?70:min/);
  assert.match(source,/matchStrength:detail\.strong\?'strong':'possible'/);
  assert.match(source,/matchReasons:detail\.reasons/);
});
