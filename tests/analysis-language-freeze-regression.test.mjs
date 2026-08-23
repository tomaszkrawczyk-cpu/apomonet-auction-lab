import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=file=>fs.readFileSync(file,'utf8');

test('analysis translation does not install a document-wide character-data observer',()=>{
  const followups=read('analysis-ai-translation-ui.js');
  assert.doesNotMatch(followups,/new MutationObserver/);
  assert.doesNotMatch(followups,/createTreeWalker\(document\.body/);
  assert.doesNotMatch(followups,/translate\(['"]analysis/);
});

test('translated follow-up questions are escaped before entering HTML',()=>{
  const followups=read('analysis-ai-translation-ui.js');
  assert.match(followups,/escapeHtml\(shown\[index\]\)/);
});

test('progress translation only mutates text when the value actually changes',()=>{
  const progress=read('analysis-progress-i18n.js');
  assert.match(progress,/if\(n\.nodeValue!==value\)n\.nodeValue=value/);
  assert.match(progress,/if\(el&&el\.textContent!==value\)el\.textContent=value/);
  for(const token of ['basicStarting','basicReading','basicComparing','basicStill','basicClientTimeout'])assert.ok(progress.includes(token),token);
});

test('service worker rotates the old shell and bypasses the HTTP cache on refresh',()=>{
  const worker=read('sw.js');
  assert.doesNotMatch(worker,/apomonet-shell-v1['"]/);
  assert.match(worker,/cache:'no-store'/);
});

test('Stage 1 sends one stable job id for safe server-side retry deduplication',()=>{
  const analyze=read('analyze.html');
  assert.match(analyze,/const jobId = `apo-/);
  assert.match(analyze,/"X-Apo-Job-Id": jobId/);
  assert.match(analyze,/mode: "basic", jobId/);
  assert.match(analyze,/d\.meta\?\.elapsedMs/);
});
