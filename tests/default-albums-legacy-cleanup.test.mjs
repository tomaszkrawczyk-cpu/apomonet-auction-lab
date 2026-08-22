import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const src=fs.readFileSync('default-albums-migration.js','utf8');

test('legacy seeded albums are recognized explicitly',()=>{
  for(const id of ['polska-krolewska','srebro','do-opracowania'])assert.ok(src.includes(id),id);
});

test('legacy albums are removed only when no coin references them',()=>{
  assert.match(src,/referenced=new Set/);
  assert.match(src,/legacy&&!referenced\.has\(album\.id\)/);
});

test('canonical system defaults remain Mój album, Moje cele and Marzenia',()=>{
  for(const id of ['my-album','goals','dreams'])assert.ok(src.includes(id),id);
  for(const name of ['Mój album','Moje cele','Marzenia'])assert.ok(src.includes(name),name);
});
