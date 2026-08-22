import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=p=>fs.readFileSync(p,'utf8');

test('album domain integrity is loaded immediately after app core',()=>{
  const app=read('app.js');
  const core=app.indexOf('app-core.js');
  const guard=app.indexOf('album-domain-integrity.js');
  assert.ok(core>=0&&guard>core);
});

test('album domain guard rejects missing targets and same-album moves',()=>{
  const src=read('album-domain-integrity.js');
  assert.match(src,/!to\|\|!exists\(state,to\)/);
  assert.match(src,/from&&from===to/);
  assert.match(src,/!target\|\|!exists\(state,target\)/);
});

test('album UI localizes fallback album name and blocks same-album move',()=>{
  const src=read('user-album-actions-i18n.js');
  for(const lang of ['pl','en','de','fr'])assert.match(src,new RegExp(`${lang}:\\{`));
  assert.match(src,/albumName=album\?\.name\|\|t\('album'\)/);
  assert.match(src,/String\(from\)===to/);
  assert.match(src,/sameAlbum/);
});
