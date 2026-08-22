import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const src=fs.readFileSync('auction-archive-core.js','utf8');

test('auction matching reuses canonical unknown sentinel helper',()=>{
  assert.match(src,/ApoCanonicalRecordSentinels\?\.isUnknown/);
  assert.match(src,/const known=v=>!unknown\(v\)/);
});

test('unknown identity values cannot count as matching evidence',()=>{
  assert.match(src,/const eq=\(a,b\)=>known\(a\)&&known\(b\)&&norm\(a\)===norm\(b\)/);
  assert.match(src,/if\(known\(coin\.ruler\)&&known\(r\.ruler\)\)/);
  assert.match(src,/if\(known\(coin\.nominal\)&&known\(r\.nominal\)\)/);
  assert.match(src,/if\(known\(coin\.year\)&&known\(r\.year\)\)/);
  assert.match(src,/if\(known\(coin\.mint\)&&known\(r\.mint\)\)/);
});

test('unknown catalog references are treated as absent evidence',()=>{
  assert.match(src,/return known\(v\)\?v:''/);
});
