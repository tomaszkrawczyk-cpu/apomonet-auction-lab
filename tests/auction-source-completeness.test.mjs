import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=p=>fs.readFileSync(p,'utf8');

test('source quality defines a complete core that requires a direct URL and core market facts',()=>{
  const core=read('auction-source-quality-core.js');
  assert.match(core,/completeCore:checks\.source&&checks\.sourceUrl&&checks\.soldAt&&checks\.currency&&checks\.price&&checks\.identity/);
});

test('valuation requires complete source evidence in addition to numerical quality score',()=>{
  const policy=read('auction-source-quality-policy.js');
  assert.match(policy,/r\.evidenceCompleteCore&&\(r\.evidenceQuality==='strong'\|\|r\.evidenceQuality==='usable'\)/);
  assert.match(policy,/Rekord bez bezpośredniego źródła pozostaje informacyjny i nie wpływa na widełki/);
});

test('incomplete auction records remain visible rather than being silently deleted',()=>{
  const policy=read('auction-source-quality-policy.js');
  assert.match(policy,/records:rows/);
  assert.match(policy,/Słabsze lub niepełne rekordy pozostają widoczne informacyjnie/);
});
