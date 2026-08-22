import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../analysis-resilience.js', import.meta.url), 'utf8');

test('analysis recovery cache accepts successful HTTP responses only', () => {
  assert.match(source, /if \(response\.ok\) \{/);
  assert.match(source, /status < 200 \|\| status >= 300/);
  assert.doesNotMatch(
    source,
    /next\.recoveryCache\[stage\]\s*=\s*\{[^}]*status:\s*response\.status[^}]*\};\s*delete next\.pending/s,
    'cache writes must remain guarded by response.ok',
  );
});

test('recovery cache stores a compact image fingerprint instead of duplicating full photos', () => {
  assert.match(source, /function requestKey\(body\)/);
  assert.match(source, /requestKey: key/);
  assert.doesNotMatch(source, /next\.recoveryCache\[stage\]\s*=\s*\{\s*requestBody:/);
  assert.match(source, /cachedEntry\?\.requestKey \|\| requestKey\(cachedEntry\?\.requestBody\)/);
});

test('analysis recovery keeps retry count bounded and only retries suspension failures', () => {
  assert.match(source, /const MAX_RETRIES = 1/);
  assert.match(source, /hiddenDuringActiveRequest \|\| document\.visibilityState === 'hidden'/);
  assert.match(source, /error\?\.name === 'AbortError' \|\| error instanceof TypeError/);
});

test('Stage 2 recovery requires a valid successful Stage 1 cache', () => {
  assert.match(source, /if \(!responseFromCache\(cache\)\)/);
  assert.match(source, /Odtwarzam Etap 1 przed wznowieniem analizy szczegółowej/);
});
