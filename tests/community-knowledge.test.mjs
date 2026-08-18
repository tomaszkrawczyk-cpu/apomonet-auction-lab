import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read=path=>fs.readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

function community(){
 const store=new Map(),localStorage={getItem:key=>store.get(key)??null,setItem:(key,value)=>store.set(key,String(value))};
 const sandbox={console,localStorage,URL,Date,Math};sandbox.window=sandbox;
 vm.runInNewContext(read('community-knowledge-core.js'),sandbox,{filename:'community-knowledge-core.js'});
 return sandbox.ApoCommunityEvidence;
}

test('community knowledge core is valid and ships curated research candidates',()=>{
 const api=community(),stats=api.stats();
 assert.ok(stats.records>=6);
 assert.ok(stats.sources>=3);
 assert.equal(stats.records,stats.candidates);
});

test('10 groszy 1973 receives the high-risk mint-mark candidate',()=>{
 const rows=community().match({year:'1973',nominal:'10 groszy',country:'Polska'});
 assert.equal(rows[0].id,'community_portal_10gr_1973');
 assert.match(rows[0].summary,/Nie wolno wyceniać/);
 assert.ok(rows[0].checks.some(x=>/ekspertyza/.test(x)));
});

test('matcher requires a specific identity and rejects same-year or same-nominal noise',()=>{
 const api=community();
 assert.equal(api.match({year:'1924',nominal:'1 grosz'}).length,0);
 assert.equal(api.match({year:'2020',nominal:'1 złoty'}).length,0);
 assert.equal(api.match({year:'1925',nominal:'2 złote'}).length,0);
 assert.equal(api.match({year:'1924',nominal:'2 złote'})[0].id,'community_forum_2zl_1924_h_counterfeit');
 assert.equal(api.match({year:'1925',nominal:'5 złotych'})[0].id,'community_portal_5zl_1925_constitution');
});

test('matcher normalizes Polish denominations without confusing their face values',()=>{
 const api=community();
 assert.equal(api.match({year:'1929',nominal:'1 złoty'})[0].id,'community_portal_1zl_1929');
 assert.equal(api.match({year:'1973',nominal:'10 gr'})[0].id,'community_portal_10gr_1973');
 assert.equal(api.match({year:'1973',nominal:'1 złoty'}).length,0);
 assert.equal(api.match({year:'1925',nominal:'50 złotych'}).length,0);
});

test('uncertain chronology does not trigger a high-risk warning',()=>{
 const api=community();
 assert.equal(api.match({year:'1608/1612',nominal:'szeląg',ruler:'Zygmunt III Waza',mint:'Ryga'}).length,0);
 assert.equal(api.match({year:'1608',nominal:'szeląg',ruler:'Zygmunt III Waza',mint:'Ryga'})[0].id,'community_blog_szelag_1608_misread');
 assert.equal(api.match({year:'1612',nominal:'szeląg',ruler:'Zygmunt III Waza',mint:'Ryga'}).length,0);
});

test('variant, die damage and counterfeit warnings remain separate candidate records',()=>{
 const api=community();
 const altered=api.match({year:'1595',nominal:'trojak',ruler:'Zygmunt III',mint:'Lublin'});
 assert.equal(altered[0].claimType,'counterfeit_warning');
 const die=api.match({year:'1977',nominal:'1 złoty'});
 assert.equal(die[0].claimType,'die_damage_vs_variety');
 for(const row of [...altered,...die]){
  assert.equal(row.candidateOnly,true);
  assert.equal(row.mayAffectConfidence,false);
  assert.equal(row.mayAffectValuation,false);
 }
});

test('provenance URL must belong to the selected source',()=>{
 const api=community();
 assert.throws(()=>api.add({source:'TPZN',sourceUrl:'https://example.test/thread',summary:'Trop'}),/HTTP\(S\)/);
 assert.doesNotThrow(()=>api.add({source:'TPZN',sourceUrl:'https://forum.tpzn.pl/index.php?topic=1',summary:'Trop'}));
});

test('every curated seed is reachable while the year-nominal cross product stays selective',()=>{
 const api=community(),rows=api.load();
 for(const row of rows){
  const coin={year:row.yearFrom?String(row.yearFrom):'',nominal:row.nominal,ruler:row.ruler,mint:row.mint,description:row.keywords.slice(0,2).join(' ')};
  assert.ok(api.match(coin).some(hit=>hit.id===row.id),`unreachable seed: ${row.id}`);
 }
 const dated=rows.filter(row=>row.yearFrom&&row.nominal),years=[...new Set(dated.map(row=>row.yearFrom))],nominals=[...new Set(dated.map(row=>row.nominal))];
 for(const year of years)for(const nominal of nominals)for(const hit of api.match({year:String(year),nominal})){
  assert.ok(year>=hit.yearFrom&&year<=hit.yearTo,`false year match: ${year} -> ${hit.id}`);
  assert.equal(hit.nominal,nominal,`false nominal match: ${nominal} -> ${hit.id}`);
 }
});

test('a known ruler or mint conflict blocks a specific warning',()=>{
 const api=community();
 assert.equal(api.match({year:'1595',nominal:'trojak',ruler:'Stefan Batory',mint:'Lublin'}).length,0);
 assert.equal(api.match({year:'1595',nominal:'trojak',ruler:'Zygmunt III Waza',mint:'Wilno'}).length,0);
});

test('restricted catalogues cannot be copied into community evidence',()=>{
 const api=community();
 assert.throws(()=>api.add({source:'KATALOG_FISCHER',sourceUrl:'https://example.test',summary:'Przepisany rekord'}),/tylko odsyłaczem/);
 assert.throws(()=>api.add({source:'TPZN',sourceUrl:'javascript:alert(1)',summary:'Trop'}),/HTTP\(S\)/);
 const row=api.add({source:'TPZN',sourceUrl:'https://forum.tpzn.pl/',summary:'Trop',status:'expert_verified'});
 assert.equal(row.status,'candidate');
});

test('community candidates load before analysis UI and cannot raise confidence',()=>{
 const app=read('app.js'),ui=read('analysis-quality-ui.js'),core=read('community-knowledge-core.js');
 assert.ok(app.indexOf('community-knowledge-core.js')<app.indexOf('analysis-quality-ui.js'));
 assert.match(ui,/HIPOTEZY \/ DO POTWIERDZENIA/);
 assert.match(ui,/nie podnoszą pewności ani wyceny/);
 assert.doesNotMatch(core,/\.confidence\s*=|estimateLow\s*=|estimateHigh\s*=/);
});

test('Numista integration is runtime-only, attributed and does not fetch images',()=>{
 const api=read('api/analysis-reference.js'),client=read('analysis-reference-check.js');
 assert.match(api,/Numista-API-Key/);
 assert.match(api,/Source: Numista/);
 assert.match(api,/catalogue\/pieces/);
 assert.doesNotMatch(api,/thumbnail|obverse_thumbnail|reverse_thumbnail/);
 assert.match(client,/Nie potwierdzają automatycznie odmiany ani autentyczności/i);
 assert.match(client,/source: "Numista"/);
 assert.match(client,/url: item\.url/);
 assert.doesNotMatch(client,/<img|thumbnail/i);
});

test('ANS similar records are direct HTTPS links without copied media',()=>{
 const api=read('api/ans-open-data.js');
 assert.match(api,/replace\(\/\^http:\/i,'https:'\)/);
 assert.match(api,/uri/);
 assert.match(api,/mediaReusable:false/);
});

test('source policy keeps community and runtime references outside automatic verification',()=>{
 const builder=read('knowledge-builder-core.js'),policy=JSON.parse(read('SOURCE_ADAPTER_POLICY_2026-08-14.json'));
 assert.match(builder,/NUMISTA_API:\{[^\n]*ingest:'REFERENCE_ONLY'/);
 assert.equal(policy.rules.communityEvidenceNeverRaisesConfidence,true);
 assert.equal(policy.rules.runtimeReferenceNeverAutoConfirmsVariety,true);
 assert.equal(policy.sources.NUMISTA_API.persistentMetadata,false);
});
