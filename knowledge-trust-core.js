(()=>{
  const LEVELS=Object.freeze({
    AI_SUGGESTION:{id:'ai_suggestion',rank:10,label:'Sugestia AI'},
    USER_CORRECTED:{id:'user_corrected',rank:30,label:'Korekta użytkownika'},
    EXPERT_VERIFIED:{id:'expert_verified',rank:70,label:'Potwierdzone przez eksperta'},
    MULTI_SOURCE_VERIFIED:{id:'multi_source_verified',rank:90,label:'Potwierdzone wieloma źródłami'}
  });
  const byId=new Map(Object.values(LEVELS).map(x=>[x.id,x]));
  const clean=v=>String(v??'').trim();
  function level(input={}){
    if(input.knowledgeTrust?.level&&byId.has(input.knowledgeTrust.level))return byId.get(input.knowledgeTrust.level);
    if(input.status==='verified'&&Array.isArray(input.sources)&&input.sources.length>=2)return LEVELS.MULTI_SOURCE_VERIFIED;
    if(input.expertVerified===true||input.expertAccepted===true||input.verifiedByExpert===true)return LEVELS.EXPERT_VERIFIED;
    if(input.userAccepted===true&&input.rawAI)return LEVELS.USER_CORRECTED;
    return LEVELS.AI_SUGGESTION;
  }
  function evidence(input={}){
    const rows=[];
    if(input.rawAI)rows.push({kind:'ai_result',at:input.rawAI.createdAt||input.analysisAt||''});
    if(input.userAccepted)rows.push({kind:'user_correction',at:input.correctedAt||input.acceptedAt||''});
    if(input.expertVerified||input.expertAccepted||input.verifiedByExpert)rows.push({kind:'expert_verification',at:input.expertVerifiedAt||input.verifiedAt||''});
    const provenance=Array.isArray(input.provenance)?input.provenance:[];
    for(const row of provenance){if(row?.source)rows.push({kind:'source',source:clean(row.source),url:clean(row.url),checkedAt:clean(row.checkedAt),expertVerified:!!row.expertVerified});}
    const sources=Array.isArray(input.sources)?input.sources:[];
    for(const source of sources){if(source&&!rows.some(r=>r.kind==='source'&&r.source===source))rows.push({kind:'source',source:clean(source)});}
    return rows;
  }
  function stamp(input={}){
    const l=level(input),existing=input.knowledgeTrust||{};
    const stamped={...input,knowledgeTrust:{...existing,level:l.id,label:l.label,rank:l.rank,evidence:evidence(input),updatedAt:new Date().toISOString()}};
    return stamped;
  }
  function canPromoteToCatalogKnowledge(input={}){
    const l=level(input);
    return l.rank>=LEVELS.EXPERT_VERIFIED.rank;
  }
  function canInfluenceLearning(input={}){
    const l=level(input);
    return l.rank>=LEVELS.USER_CORRECTED.rank;
  }
  function compare(a,b){return level(b).rank-level(a).rank;}
  function installWriteGuard(){
    if(!window.ApoMonet||ApoMonet.__knowledgeTrustGuard)return;
    const original=ApoMonet.upsertCoin;
    ApoMonet.upsertCoin=function(coin){return original.call(ApoMonet,stamp(coin));};
    ApoMonet.__knowledgeTrustGuard=true;
  }
  window.ApoKnowledgeTrust=Object.freeze({LEVELS,level,stamp,evidence,canPromoteToCatalogKnowledge,canInfluenceLearning,compare});
  if(typeof document!=='undefined'){
    const init=()=>installWriteGuard();
    document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init):init();
  }
})();
