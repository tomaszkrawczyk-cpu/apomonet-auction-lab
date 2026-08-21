import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const i18n=readFileSync(new URL('../analysis-content-i18n.js',import.meta.url),'utf8');
const analyze=readFileSync(new URL('../analyze.html',import.meta.url),'utf8');
const invalidation=readFileSync(new URL('../derived-analysis-invalidation.js',import.meta.url),'utf8');

test('translation cache is keyed by the current record content',()=>{
  assert.match(i18n,/hash\(JSON\.stringify\(items\)\)/);
  assert.match(i18n,/const cacheKey = `\$\{language\}:\$\{hash\(JSON\.stringify\(items\)\)\}`/);
});

test('analysis translation localizes the current in-memory accepted record',()=>{
  assert.match(analyze,/const source = a;/);
  assert.match(analyze,/const translated = await translator\.localize\(source\)/);
  assert.match(analyze,/if \(a !== source\) return;/);
});

test('identity correction removes stale detail and market data before translation',()=>{
  for(const field of ['detail','kopickiReference','kopickiRarity','auctionRecords10y','marketMedian','estimateLow','estimateHigh']){
    assert.match(invalidation,new RegExp(`"${field}"`));
  }
  assert.match(invalidation,/for \(const key of DERIVED_FIELDS\) delete output\[key\]/);
});

test('Polish display bypasses translated cache and returns the live record',()=>{
  assert.match(i18n,/language === "pl"/);
  assert.match(i18n,/return record/);
});
