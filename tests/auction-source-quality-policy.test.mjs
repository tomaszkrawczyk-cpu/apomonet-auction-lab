import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
const core=readFileSync(new URL('../auction-source-quality-core.js',import.meta.url),'utf8');
const policy=readFileSync(new URL('../auction-source-quality-policy.js',import.meta.url),'utf8');
const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
test('source quality rewards complete source evidence',()=>{assert.match(core,/sourceUrl/);assert.match(core,/soldAt/);assert.match(core,/completeCore/);assert.match(core,/level=score>=85\?'strong':score>=65\?'usable'/)});
test('weak or incomplete source records stay visible but do not enter valuation pool',()=>{assert.match(policy,/const rows=ApoArchive\.comparable/);assert.match(policy,/evidenceCompleteCore&&\(r\.evidenceQuality==='strong'\|\|r\.evidenceQuality==='usable'\)/);assert.match(policy,/Słabsze lub niepełne rekordy pozostają widoczne informacyjnie, ale nie wpływają na wycenę/)});
test('runtime loads source quality before valuation policy',()=>{const a=app.indexOf('auction-source-quality-core.js'),b=app.indexOf('auction-source-quality-policy.js');assert.ok(a>=0&&b>a)});
