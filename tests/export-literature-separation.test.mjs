import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=p=>fs.readFileSync(p,'utf8');

test('Excel exports specialist literature in dedicated columns separate from market valuation',()=>{
  const sheet=read('xlsx-sheet.js');
  for(const token of ['Tyszkiewicz','Parchimowicz','Wartość historyczna Tyszkiewicza','Wycena','Zakres'])assert.ok(sheet.includes(token),token);
  const historical=sheet.indexOf('Wartość historyczna Tyszkiewicza');
  const valuation=sheet.indexOf('Wycena');
  assert.ok(historical>=0&&valuation>historical,'historical catalog value must be separate and precede market valuation');
  assert.match(sheet,/c\.tyszkiewiczReference/);
  assert.match(sheet,/c\.tyszkiewiczValue/);
  assert.match(sheet,/c\.parchimowiczReference/);
  assert.match(sheet,/c\.marketMedian/);
  assert.match(sheet,/c\.estimateLow/);
  assert.match(sheet,/c\.estimateHigh/);
});

test('PDF export has distinct specialist-literature and contemporary-market sections',()=>{
  const page=read('export.html');
  assert.match(page,/Literatura specjalistyczna/);
  assert.match(page,/Rynek współczesny/);
  assert.match(page,/Tyszkiewicz/);
  assert.match(page,/Parchimowicz/);
  assert.match(page,/wartość historyczna/i);
  assert.match(page,/nie jest.*wycen/i);
  assert.match(page,/c\.tyszkiewiczReference/);
  assert.match(page,/c\.tyszkiewiczValue/);
  assert.match(page,/c\.parchimowiczReference/);
});

test('PDF export translations include literature and market labels in every current UI language',()=>{
  const i18n=read('export-i18n.js');
  for(const lang of ['pl','en','de','fr'])assert.ok(i18n.includes(`${lang}:{`),lang);
  for(const token of ['literature','market','tyszkiewicz','parchimowicz','historical'])assert.ok(i18n.includes(token),token);
});

test('historical Tyszkiewicz value is never used as a market valuation fallback',()=>{
  const page=read('export.html');
  const sheet=read('xlsx-sheet.js');
  assert.doesNotMatch(page,/estimatedPrice\|\|c\.tyszkiewiczValue|marketMedian\|\|c\.tyszkiewiczValue/);
  assert.doesNotMatch(sheet,/estimatedPrice\|\|c\.tyszkiewiczValue|marketMedian\|\|c\.tyszkiewiczValue/);
});
