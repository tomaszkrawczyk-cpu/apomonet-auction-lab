import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const src=fs.readFileSync('calendar-runtime-i18n.js','utf8');
const app=fs.readFileSync('app.js','utf8');

test('calendar runtime i18n is loaded by the application',()=>{
  assert.match(app,/calendar-runtime-i18n\.js/);
});

test('calendar dates use the active language locale instead of fixed pl-PL',()=>{
  for(const token of ["pl:'pl-PL'","en:'en-GB'","de:'de-DE'","fr:'fr-FR'"])assert.ok(src.includes(token),token);
  assert.match(src,/Intl\.DateTimeFormat\(locale\(\)/);
});

test('dynamic calendar actions and empty state are localized',()=>{
  for(const token of ['remind','open','empty','domestic','foreign','source'])assert.ok(src.includes(token),token);
});

test('calendar reminder ICS localizes user-facing description and alarm text',()=>{
  assert.match(src,/localizedReminder/);
  assert.match(src,/TRIGGER:-P2D/);
  assert.match(src,/t\('alarm'\)/);
  assert.match(src,/t\('note'\)/);
});
