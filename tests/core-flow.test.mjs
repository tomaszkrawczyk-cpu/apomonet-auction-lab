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

function albumPhotoResolver(){
  const sandbox={
    console,
    location:{pathname:'/tests'},
    localStorage:{getItem(){return 'pl'}},
    sessionStorage:{getItem(){return null},removeItem(){},setItem(){}},
    document:{readyState:'loading'},
    addEventListener(){},
    Image:class {},
  };
  sandbox.window=sandbox;
  vm.runInNewContext(read('album-photo-prep.js'),sandbox,{filename:'album-photo-prep.js'});
  return sandbox.ApoAlbumPhotos.resolve;
}

function collectionI18n(){
  const sandbox={
    console,
    location:{pathname:'/collection.html'},
    localStorage:{getItem(){return 'de'},setItem(){}},
    document:{readyState:'loading',addEventListener(){}},
    addEventListener(){},
    MutationObserver:class {},
  };
  sandbox.window=sandbox;
  vm.runInNewContext(read('collection-content-i18n.js'),sandbox,{filename:'collection-content-i18n.js'});
  return sandbox.ApoCollectionI18n;
}

function collectionSort(){
  const sandbox={console,Intl};
  sandbox.window=sandbox;
  vm.runInNewContext(read('collection-sort.js'),sandbox,{filename:'collection-sort.js'});
  return sandbox.ApoCollectionSort;
}

function xlsxPackage(){
  const sandbox={console,TextEncoder,Uint8Array};
  sandbox.window=sandbox;
  vm.runInNewContext(read('zip-store.js'),sandbox,{filename:'zip-store.js'});
  vm.runInNewContext(read('xlsx-sheet.js'),sandbox,{filename:'xlsx-sheet.js'});
  vm.runInNewContext(read('xlsx-package.js'),sandbox,{filename:'xlsx-package.js'});
  return sandbox.ApoXLSXPackage;
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
  const textured=safeCrop({width:800,height:600},{cx:400,cy:300,r:120,score:25,confidence:90,backgroundTexture:14});
  const edge=safeCrop({width:800,height:600},{cx:90,cy:300,r:100,score:25});
  assert.equal(weak.mode,'full');
  assert.deepEqual({...weak},{x:0,y:0,width:800,height:600,mode:'full'});
  assert.equal(textured.mode,'full');
  assert.equal(edge.mode,'full');
});

test('photo quality warns before analysis on textured or uncertain photos',()=>{
  const {assessPhoto}=imagePipeline();
  const textured=assessPhoto(
    {score:24,confidence:90,backgroundTexture:14},
    {mode:'full'},
  );
  const uncertain=assessPhoto(
    {score:8,confidence:18,backgroundTexture:3},
    {mode:'full'},
  );
  const clear=assessPhoto(
    {score:24,confidence:90,backgroundTexture:3},
    {mode:'safe-crop'},
  );
  assert.equal(textured.level,'retake');
  assert.equal(textured.reason,'textured-background');
  assert.equal(uncertain.reason,'uncertain-edge');
  assert.equal(clear.level,'good');

  const page=read('analyze.html');
  assert.match(page,/id="photoQuality"/);
  assert.match(page,/photoDiagnostics/);
  assert.match(page,/Tło jest wzorzyste/);
  assert.match(page,/photoDiagnostics, at: Date\.now\(\), version: 5/);
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
  assert.match(coin,/ApoAlbumPhotos\.resolve\(coin, "obverse"\)/);
  assert.match(coin,/ApoAlbumPhotos\.resolve\(coin, "reverse"\)/);
  assert.match(coin,/coin\.userAccepted/);
  assert.match(coin,/coin-edit\.html\?id=/);
  assert.match(coin,/\[hidden\]\s*\{\s*display:\s*none\s*!important/);
});

test('selected language translates analysis values without sending photos or owner notes',()=>{
  const app=read('app.js');
  const client=read('analysis-content-i18n.js');
  const collectionClient=read('collection-content-i18n.js');
  const api=read('api/translate-analysis.js');
  const analysis=read('analyze.html');
  const coin=read('coin.html');
  assert.match(app,/analysis-content-i18n\.js/);
  assert.match(app,/collection-content-i18n\.js/);
  assert.match(client,/fetch\("\/api\/translate-analysis"/);
  assert.match(client,/"fullDescription"/);
  assert.match(client,/"warnings"/);
  assert.doesNotMatch(client,/obverseImage|reverseImage|userAdditionalInfo|provenance/);
  assert.doesNotMatch(api,/obverseImage|reverseImage|userAdditionalInfo|provenance/);
  assert.doesNotMatch(collectionClient,/obverseImage|reverseImage|rawAI|notes|provenance/);
  assert.match(collectionClient,/MAX_ITEMS = 60/);
  assert.match(collectionClient,/fetch\("\/api\/translate-analysis"/);
  assert.doesNotMatch(collectionClient,/hidden\s*=/);
  assert.match(api,/Preserve dates, numbers, catalog references, rarity codes, mint marks and transcribed coin legends exactly/);
  assert.match(analysis,/await localizeCurrent/);
  assert.match(analysis,/window\.__apoLocalizedAnalysis = translated/);
  assert.match(coin,/await translator\.localize\(coin\)/);
  assert.ok(
    coin.indexOf("content.hidden = false") <
      coin.indexOf("await translator.localize(coin)"),
    "the saved card must remain visible while its translation is loading",
  );
});

test('collection and album translations are batched and limited to safe summary fields',()=>{
  const {buildItems}=collectionI18n();
  const records=Array.from({length:40},(_,index)=>({
    id:`coin-${index}`,
    title:`Tytuł ${index}`,
    ruler:`Władca ${index}`,
    nominal:`Nominał ${index}`,
    metal:'Srebro',
    mint:`Mennica ${index}`,
    notes:`Prywatna notatka ${index}`,
    provenance:`Proweniencja ${index}`,
    obverseImage:`photo-${index}`,
  }));
  const result=buildItems(records);
  assert.equal(result.items.length,60);
  assert.ok(result.items.every(item=>/^summary\.\d+\.(title|country|ruler|nominal|metal|mint|variant|grade|rarity)$/.test(item.key)));
  assert.ok(result.items.every(item=>!item.text.includes('Prywatna notatka')));
  assert.ok(result.items.every(item=>!item.text.includes('photo-')));

  const api=read('api/translate-analysis.js');
  assert.match(api,/SUMMARY_FIELDS/);
  assert.match(api,/\^summary\\\.\(\\d\{1,2\}\)\\\./);
});

test('background removal detects the coin and writes a transparent PNG only when reliable',()=>{
  const prep=read('album-photo-prep.js');
  const albumCovers=read('user-albums-ui.js');
  assert.match(prep,/ApoImagePipeline\?\.detectCircle\?\.\(work\)/);
  assert.match(prep,/detection\.confidence/);
  assert.match(prep,/detection\.backgroundTexture/);
  assert.match(prep,/context\.clearRect\(0, 0, size, size\)/);
  assert.match(prep,/context\.arc\(size \/ 2, size \/ 2, maskRadius/);
  assert.match(prep,/output\.toDataURL\("image\/png"\)/);
  assert.match(prep,/removed: false, reason: "uncertain"/);
  assert.match(prep,/Zdjęcie nie zostało zmienione/);
  assert.match(prep,/window\.ApoAlbumPhotos = Object\.freeze/);
  assert.match(prep,/albumObverseImage \|\| coin\.albumReverseImage/);
  assert.match(albumCovers,/ApoAlbumPhotos\.resolve\(coin, "obverse"\)/);
  assert.match(albumCovers,/coverPhotos\(coins\)/);
});

test('every album surface resolves the prepared transparent image consistently',()=>{
  const resolve=albumPhotoResolver();
  const coin={
    obverseImage:'original-obverse',
    reverseImage:'original-reverse',
    albumObverseImage:'transparent-obverse',
    albumReverseImage:'transparent-reverse',
  };
  assert.equal(resolve({...coin,albumPhotoMode:'cut'},'obverse'),'transparent-obverse');
  assert.equal(resolve({...coin,albumPhotoMode:'cut'},'reverse'),'transparent-reverse');
  assert.equal(resolve({...coin,albumPhotoMode:'original'},'obverse'),'original-obverse');
  assert.equal(resolve({...coin,albumPhotoMode:'none'},'obverse'),'');
});

test('collection sorting keeps years and traditional denominations predictable',()=>{
  const {nominalRank,sortCoins,yearValue}=collectionSort();
  assert.ok(nominalRank({nominal:'Dwutalar'})>nominalRank({nominal:'Talar'}));
  assert.ok(nominalRank({nominal:'Talar'})>nominalRank({nominal:'Ort'}));
  assert.ok(nominalRank({nominal:'Trojak'})>nominalRank({nominal:'Grosz'}));
  assert.equal(yearValue({year:'ok. X–XI w.'}),900);

  const coins=[
    {id:'unknown',title:'Bez daty'},
    {id:'new',year:'1934'},
    {id:'old',year:'1650'},
  ];
  assert.deepEqual(
    Array.from(sortCoins(coins,'year-asc'),coin=>coin.id),
    ['old','new','unknown'],
  );
  assert.deepEqual(
    Array.from(sortCoins(coins,'year-desc'),coin=>coin.id),
    ['new','old','unknown'],
  );
});

test('large collections use thumbnails, two views and bounded batches',()=>{
  const collection=read('collection.html');
  const coin=read('coin.html');
  assert.match(collection,/id="gridView"/);
  assert.match(collection,/id="listView"/);
  assert.match(collection,/id="sortDialog"/);
  assert.match(collection,/ApoAlbumPhotos\.resolve\(coin, "obverse"\)/);
  assert.match(collection,/const PAGE_SIZE = 60/);
  assert.match(collection,/loading="lazy"/);
  assert.match(collection,/Pokaż kolejne 60/);
  assert.match(collection,/aria-label="Otwórz kartę:/);
  assert.match(collection,/message\("shown", visible\.length, all\.length\)/);
  assert.match(collection,/viewOptions\.setAttribute\("aria-label", tr\("Sposób wyświetlania kolekcji"\)\)/);
  assert.match(read('collection-content-i18n.js'),/openLink\.setAttribute\("aria-label"/);
  assert.match(coin,/id="deleteCoin"/);
  assert.match(coin,/ApoMonet\.deleteCoin\(coin\.id\)/);
});

test('XLSX export is a real private workbook with selected coin fields',()=>{
  const bytes=xlsxPackage().build([{
    title:'Talar 1794',
    ruler:'Stanisław August Poniatowski',
    year:'1794',
    nominal:'Talar',
    metal:'Srebro',
    rawAI:'PRIVATE RAW RESULT',
    obverseImage:'PRIVATE PHOTO',
  }]);
  assert.equal(bytes[0],0x50);
  assert.equal(bytes[1],0x4b);
  const text=new TextDecoder().decode(bytes);
  assert.match(text,/xl\/worksheets\/sheet1\.xml/);
  assert.match(text,/Talar 1794/);
  assert.match(text,/Stanisław August Poniatowski/);
  assert.doesNotMatch(text,/PRIVATE RAW RESULT|PRIVATE PHOTO/);
});
