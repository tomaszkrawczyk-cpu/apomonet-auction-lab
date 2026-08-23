import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');

test('album cover uses either available prepared side',()=>{
  const src=read('user-albums-ui.js');
  assert.match(src,/resolve\(coin,'obverse'\)\|\|ApoAlbumPhotos\.resolve\(coin,'reverse'\)/);
});

test('system and custom albums are visually distinguished',()=>{
  const src=read('user-albums-ui.js');
  assert.match(src,/album\.systemDefault\|\|album\.kind\?t\('system'\):t\('custom'\)/);
});

test('duplicate custom album names are blocked in UI',()=>{
  const src=read('user-albums-ui.js');
  assert.match(src,/some\(a=>String\(a\.name\|\|''\)/);
  assert.match(src,/t\('exists'\)/);
});

test('canonical album UI removes legacy custom cards and owns the new-album action',()=>{
  const src=read('user-albums-ui.js');
  assert.match(src,/\[data-custom-album\]/);
  assert.match(src,/button\.onclick=null/);
  assert.match(src,/button\.dataset\.apoAlbumBound/);
  assert.match(src,/esc\(album\.name\)/);
  assert.match(src,/esc\(album\.description/);
});
