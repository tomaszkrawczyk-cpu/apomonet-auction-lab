import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../coin-stage2-summary-fix.js', import.meta.url), 'utf8');

test('unconfirmed catalog candidates do not populate the confirmed rarity field', () => {
  assert.match(source, /function confirmedKopicki\(detail\)/);
  assert.match(source, /kopickiConfirmed\?detail\.kopickiRarity/);
  assert.doesNotMatch(source, /candidate\.rarity\|\|coin\.rarity/);
});

test('candidate catalog reference remains explicitly marked as a candidate', () => {
  assert.match(source, /!kopickiConfirmed&&candidate\.reference/);
  assert.match(source, /candidate\}\`/);
});
