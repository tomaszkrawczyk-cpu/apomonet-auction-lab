import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

function imagePipeline(){
  const sandbox={
    console,
    document:{readyState:'loading'},
    location:{pathname:'/tests'},
    addEventListener(){},
    FileReader:class {},
    Image:class {}
  };
  sandbox.window=sandbox;
  vm.runInNewContext(read('analysis-image-pipeline.js'),sandbox,{filename:'analysis-image-pipeline.js'});
  return sandbox.ApoImagePipeline;
}

test('safe crop keeps a generous margin around a reliable coin edge',()=>{
  const {safeCrop}=imagePipeline();
  const crop=safeCrop({width:600,height:600},{cx:300,cy:300,r:100,score:22});
  assert.equal(crop.mode,'safe-crop');
  assert.ok(crop.x<200,'left crop edge must stay outside the detected coin');
  assert.ok(crop.y<200,'top crop edge must stay outside the detected coin');
  assert.ok(crop.x+crop.width>400,'right crop edge must stay outside the detected coin');
  assert.ok(crop.y+crop.height>400,'bottom crop edge must stay outside the detected coin');
});

test('uncertain or edge-touching detection falls back to the full photo',()=>{
  const {safeCrop}=imagePipeline();
  const weak=safeCrop({width:800,height:600},{cx:400,cy:300,r:120,score:7});
  const edge=safeCrop({width:800,height:600},{cx:90,cy:300,r:100,score:25});
  assert.equal(weak.mode,'full');
  assert.deepEqual({...weak},{x:0,y:0,width:800,height:600,mode:'full'});
  assert.equal(edge.mode,'full');
});

test('analysis data URL quality is reduced until it is below the transport budget',()=>{
  const {boundedDataUrl}=imagePipeline();
  const calls=[];
  const canvas={toDataURL(type,quality){calls.push({type,quality});return quality>.5?'x'.repeat(1500001):'x'.repeat(1000)}};
  const data=boundedDataUrl(canvas,'image/jpeg',.62);
  assert.equal(data.length,1000);
  assert.ok(calls.length>1);
  assert.ok(calls.at(-1).quality<=.5);
});

test('only the bounded image pipeline owns the runtime processCoin override',()=>{
  const appCore=read('app-core.js');
  const app=read('app.js');
  const upload=read('analysis-unified-upload.js');
  assert.doesNotMatch(appCore,/window\.processCoin\s*=\s*async/);
  assert.match(appCore,/ApoImagePipeline\?\.install/);
  assert.match(app,/analysis-image-pipeline\.js/);
  assert.doesNotMatch(upload,/HTMLCanvasElement\.prototype\.toDataURL\s*=/);
});

test('critical UI flow still contains both photos, analysis, correction and save boundaries',()=>{
  const page=read('analyze.html');
  const correction=read('analysis-inline-correction.js');
  assert.match(page,/id="obverseInput"[^>]*type="file"/);
  assert.match(page,/id="reverseInput"[^>]*type="file"/);
  assert.doesNotMatch(page,/id="obverseInput"[^>]*hidden/);
  assert.doesNotMatch(page,/id="reverseInput"[^>]*hidden/);
  assert.match(page,/fetch\(["']\/api\/analyze["']/);
  assert.match(page,/ApoMonet\.upsertCoin/);
  assert.match(page,/restoreAnalysisSession/);
  assert.match(correction,/rawAI/);
  assert.match(correction,/userAccepted=true/);
  assert.match(correction,/obverseImage:imgs\[0\],reverseImage:imgs\[1\]/);
});

test('state loading protects every collection array and storage failure is explicit',()=>{
  const core=read('app-core.js');
  for(const key of ['coins','albums','watchlist','events','history']){
    assert.match(core,new RegExp(`${key}:Array\\.isArray\\(raw\\.${key}\\)`));
  }
  assert.match(core,/APOMONET_STORAGE_WRITE_FAILED/);
  assert.match(core,/Dane nie zostały nadpisane/);
});

test('Stage 1 API requires two bounded images and returns a structured analysis',()=>{
  const api=read('api/analyze.js');
  assert.match(api,/im\.length<2/);
  assert.match(api,/x\.length>1800000/);
  assert.match(api,/imageUsable/);
  assert.match(api,/confidence:\{type:"integer",minimum:0,maximum:95\}/);
  assert.match(api,/analysis:a/);
});

test('Stage 2 strips saved photos, reports progress and has bounded latency',()=>{
  const api=read('api/analyze-detail.js');
  const page=read('analyze.html');
  assert.match(api,/const BASE_FIELDS = \[/);
  assert.doesNotMatch(api,/BASE_FIELDS = \[[\s\S]*?obverseImage/);
  assert.doesNotMatch(api,/BASE_FIELDS = \[[\s\S]*?reverseImage/);
  assert.match(api,/reasoning: \{ effort: "low" \}/);
  assert.match(api,/DETAIL_TIMEOUT_MS = 55_000/);
  assert.match(api,/status\(timedOut \? 504 : 500\)/);
  assert.match(page,/body: JSON\.stringify\(\{ images: analysisImgs, base: detailBase\(\) \}\)/);
  assert.doesNotMatch(page,/images: analysisImgs, base: a/);
  assert.match(page,/Odczytuję legendę i detale stempla/);
  assert.match(page,/const controller = new AbortController\(\)/);
  assert.match(page,/controller\.abort\(\), 62_000/);
  assert.match(page,/typeof error\?\.message === "string"/);
  assert.doesNotMatch(page,/throw Error\(d\.error \|\|/);
});

test('chronology guard is valid JavaScript and remains non-blocking',()=>{
  const guard=read('chronology-guard.js');
  assert.doesNotThrow(()=>new Function(guard));
  assert.match(guard,/if \(!chronologyWarning\) return/);
});

test('a saved coin reopens from the collection with both photos and accepted data',()=>{
  const analysis=read('analyze.html');
  const collection=read('collection.html');
  const coin=read('coin.html');
  assert.match(analysis,/id="savedActions"/);
  assert.match(analysis,/id="savedCoinLink"/);
  assert.match(analysis,/"coin\.html\?id=" \+ encodeURIComponent\(c\.id\)/);
  assert.match(analysis,/href="collection\.html"/);
  assert.match(analysis,/href="albums\.html"/);
  assert.match(collection,/coin\.html\?id=/);
  assert.match(collection,/Otwórz kartę/);
  assert.match(coin,/ApoMonet\.getCoin\(id\)/);
  assert.match(coin,/coin\.obverseImage/);
  assert.match(coin,/coin\.reverseImage/);
  assert.match(coin,/coin\.userAccepted/);
  assert.match(coin,/coin-edit\.html\?id=/);
  assert.match(coin,/\[hidden\]\s*\{\s*display:\s*none\s*!important/);
});
