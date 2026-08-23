import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const page=fs.readFileSync('archive.html','utf8');

test('manual archive rendering escapes user-controlled market facts',()=>{
  assert.match(page,/const \$=x=>document\.getElementById\(x\),esc=/);
  for(const value of ['r.soldAt','r.sourceLabel||r.source','r.title||\'Moneta\'','r.quality||\'\''])assert.ok(page.includes(`esc(${value})`),value);
});

test('manual archive accepts only HTTP(S) source links and no automated WCN importer',()=>{
  assert.match(page,/safeUrl=/);
  assert.match(page,/\^https\?:\$/);
  assert.match(page,/rel="noopener noreferrer"/);
  assert.doesNotMatch(page,/id="importBtn"/);
  assert.doesNotMatch(page,/\/api\/market-fact/);
});
