(()=>{
  const original=window.fetch?.bind(window);if(!original||window.__apoCatalogCandidateEnrichment)return;window.__apoCatalogCandidateEnrichment=true;
  const clean=v=>String(v??'').trim();
  const eligibleCountry=base=>{const c=clean(base?.country).toLowerCase();return !c||/(polsk|poland|rzeczpospolit|korona|litw|gdańsk|gdansk|prus|śląsk|slask|pomor|krak|wielkopol|mazow)/.test(c)};
  const sessionId=()=>{try{return JSON.parse(sessionStorage.getItem('apomonetAnalysisSession')||'null')?.id||''}catch{return''}};
  const persistCandidate=candidate=>{
    const id=sessionId();if(!id||!window.ApoMonet?.getCoin||!window.ApoMonet?.upsertCoin)return false;
    const coin=ApoMonet.getCoin(id);if(!coin)return false;
    const identityKey=window.ApoCorrectionReanalysisResolution?.identityKey?.(coin)||window.ApoStage2Persist?.identityKey?.(coin)||'';
    if(!identityKey||coin.detailReanalysisIdentityKey!==identityKey||!coin.detailReanalysisCompletedAt)return false;
    const detail=coin.detail&&typeof coin.detail==='object'?coin.detail:{};
    const current=detail.catalogCandidate&&typeof detail.catalogCandidate==='object'?detail.catalogCandidate:{};
    const nextCandidate={...current,...candidate};
    ApoMonet.upsertCoin({id:coin.id,detail:{...detail,catalogCandidate:nextCandidate,catalogEvidenceStatus:detail.catalogEvidenceStatus==='supported-by-stage2-variant-evidence'?detail.catalogEvidenceStatus:'unconfirmed'}});
    return true;
  };
  window.fetch=async(input,init)=>{
    const response=await original(input,init);
    if(!String(input||'').includes('/api/analyze-detail')||!response.ok)return response;
    try{
      const payload=await response.clone().json();const detail=payload?.detail;if(!detail)return response;
      if(clean(detail.kopickiReference)||clean(detail.catalogCandidate?.reference))return response;
      let req={};try{req=JSON.parse(init?.body||'{}')}catch{}
      const base=req.base||{};if(!eligibleCountry(base))return response;
      const r=await original('/api/health',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode:'catalog-candidate',images:req.images||[],base,detail})});
      if(!r.ok)return response;const data=await r.json();const candidate=data?.candidate;if(!candidate?.applicable)return response;
      const reference=clean(candidate.candidateReference),rarity=clean(candidate.candidateRarity),confidence=Number(candidate.confidence)||0;
      const normalizedCandidate={reference,rarity:/^(?:R|R[1-8])$/i.test(rarity)?rarity.toUpperCase():'',confidence,basis:clean(candidate.basis),source:'focused-catalog-pass'};
      const enriched={...detail,catalogCandidate:normalizedCandidate};
      if(reference){
        enriched.warnings=[...(Array.isArray(detail.warnings)?detail.warnings:[]),`Kandydat katalogowy z dodatkowego przebiegu: ${reference}${rarity?` • ${rarity}`:''} (${confidence}%). Wymaga potwierdzenia przez cechy wariantowe Stage 2.`];
        try{persistCandidate(normalizedCandidate)}catch(error){console.warn('[catalog-candidate-persist]',error)}
      }
      // The focused pass may discover a candidate, but it must never self-promote it to confirmed literature.
      // Confirmation is owned by the deterministic Stage 2 evidence gate.
      return new Response(JSON.stringify({...payload,detail:enriched}),{status:response.status,statusText:response.statusText,headers:response.headers});
    }catch(error){console.warn('[catalog-candidate-enrichment]',error);return response;}
  };
  window.ApoCatalogCandidateEnrichment=Object.freeze({eligibleCountry,sessionId,persistCandidate});
})();