(()=>{
 const KEY='apomonetMultiSourceKnowledgeV1';
 const SOURCES={
  nomisma:{tier:'GREEN',kind:'knowledge',license:'CC BY 3.0',automated:true},
  ans:{tier:'GREEN',kind:'knowledge',license:'Open Database License; image rights per record/date',automated:true},
  met:{tier:'GREEN',kind:'knowledge_visual',license:'CC0/public-domain per object',automated:true},
  smithsonian:{tier:'GREEN',kind:'knowledge_visual',license:'CC0 per Open Access record',automated:true},
  wikidata:{tier:'GREEN',kind:'knowledge',license:'CC0',automated:true},
  europeana:{tier:'GREEN_METADATA_MEDIA_CONDITIONAL',kind:'knowledge',license:'metadata CC0; media per rights statement',automated:true},
  wcn:{tier:'YELLOW_DIRECT_RECORD_BATCH',kind:'market_fact',automated:true,maxBatch:8,noDiscovery:true,storeDescriptions:false,storeImages:false},
  stary_sklep:{tier:'GREEN_AFTER_PERMISSION',kind:'expert_reference',automated:false},
  onebid:{tier:'YELLOW',kind:'market_reference',automated:false},
  niemczyk:{tier:'YELLOW_PERMISSION_REQUIRED_FOR_AUTOMATION',kind:'market_reference',automated:false},
  numisbids:{tier:'RED_AUTOMATION',kind:'reference_only',automated:false},
  coinstrail:{tier:'RED_AUTOMATION',kind:'reference_only',automated:false}
 };
 const load=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch{return[]}};
 const save=a=>localStorage.setItem(KEY,JSON.stringify(a));
 const norm=s=>String(s??'').trim();
 function ingest(record){
  if(!record?.source||!SOURCES[record.source]) throw Error('Unknown source');
  const p=SOURCES[record.source];
  if(String(p.tier).startsWith('RED')) throw Error('Source blocked for automated ingestion');
  const out={id:record.id||crypto.randomUUID(),source:record.source,sourceId:norm(record.sourceId),sourceUrl:norm(record.sourceUrl),license:record.license||p.license||null,rightsCheckedAt:new Date().toISOString(),coin:{ruler:norm(record.coin?.ruler),denomination:norm(record.coin?.denomination),year:norm(record.coin?.year),mint:norm(record.coin?.mint),metal:norm(record.coin?.metal),weight:record.coin?.weight??null,diameter:record.coin?.diameter??null,variant:norm(record.coin?.variant)},market:record.market||null,image:record.image&&record.image.open===true?record.image:null,notes:record.notes?norm(record.notes):null};
  const a=load(),key=[out.source,out.sourceId||out.sourceUrl].join('|');
  const i=a.findIndex(x=>[x.source,x.sourceId||x.sourceUrl].join('|')===key);
  if(i>=0)a[i]={...a[i],...out,id:a[i].id}; else a.push(out); save(a); return out;
 }
 function evidence(coin){
  const q=coin||{}, score=r=>{let s=0;if(q.ruler&&r.coin.ruler&&q.ruler.toLowerCase()===r.coin.ruler.toLowerCase())s+=3;if(q.denomination&&r.coin.denomination&&q.denomination.toLowerCase()===r.coin.denomination.toLowerCase())s+=3;if(q.year&&r.coin.year&&String(q.year)===String(r.coin.year))s+=2;if(q.mint&&r.coin.mint&&q.mint.toLowerCase()===r.coin.mint.toLowerCase())s+=1;return s};
  return load().map(r=>({...r,matchScore:score(r)})).filter(r=>r.matchScore>=3).sort((a,b)=>b.matchScore-a.matchScore);
 }
 window.ApoMultiSource={SOURCES,load,ingest,evidence};
})();