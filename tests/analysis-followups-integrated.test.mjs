import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=p=>fs.readFileSync(p,'utf8');

test('analysis AI translation layer renders Stage 1 follow-up questions and saves owner answers',()=>{
  const ui=read('analysis-ai-translation-ui.js');
  assert.match(ui,/followUpQuestions/);
  assert.match(ui,/apomonetFollowUps/);
  assert.match(ui,/apomonetOwnerAnswers/);
  assert.match(ui,/apo:owner-followups-saved/);
});

test('saved owner answers are passed into Stage 2 base userAdditionalInfo',()=>{
  const ui=read('analysis-ai-translation-ui.js');
  assert.match(ui,/url==='\/api\/analyze-detail'/);
  assert.match(ui,/userAdditionalInfo:answers\.map/);
  assert.match(ui,/question.*answer/);
});

test('follow-up copy is localized for the current supported UI languages',()=>{
  const ui=read('analysis-ai-translation-ui.js');
  for(const l of ['pl','en','de','fr']) assert.match(ui,new RegExp(`${l}:\\{title:`));
});

test('legacy follow-up wrapper remains disconnected to avoid competing fetch interception',()=>{
  const app=read('app.js');
  assert.doesNotMatch(app,/analysis-followups\.js/);
  assert.match(app,/analysis-ai-translation-ui\.js/);
});
