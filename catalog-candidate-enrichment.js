(()=>{
  const original=window.fetch?.bind(window);if(!original||window.__apoCatalogCandidateEnrichment)return;window.__apoCatalogCandidateEnrichment=true;
  const clean=v=>String(v??'').trim();
  const eligibleCountry=base=>{const c=clean(base?.country).toLowerCase();return !c||/(polsk|poland|rzeczpospolit|korona|litw|gdańsk|gdansk|prus|śląsk|slask|pomor|krak|wielkopol|mazow)/.test(c)};
  window.fetch=async(input,init)=>{
    const response=await original(input,init);
    if(!String(input||'').includes('/api/analyze-detail')||!response.ok)return response;
    try{
      const payload=await response.clone().json();const detail=payload?.detail;if(!detail)return response;
      if(clean(detail.kopickiReference)||clean(detail.catalogCandidate?.reference))return response;
      let req={};try{req=JSON.parse(init?.body||'{}')}catch{}
      const base=req.base||{};if(!eligibleCountry(base))return response;
      const r=await original('/api/catalog-candidate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({images:req.images||[],base,detail})});
      if(!r.ok)return response;const data=await r.json();const candidate=data?.candidate;if(!candidate?.applicable)return response;
      const reference=clean(candidate.candidateReference),rarity=clean(candidate.candidateRarity);
      const enriched={...detail,catalogCandidate:{reference,rarity,confidence:Number(candidate.confidence)||0,basis:clean(candidate.basis),source:'focused-catalog-pass'}};
      if(reference&&Number(candidate.confidence)>=88){enriched.kopickiReference=reference;if(/^(?:R|R[1-8])$/i.test(rarity))enriched.kopickiRarity=rarity.toUpperCase();enriched.catalogEvidenceStatus='focused-catalog-high-confidence';}
      else if(reference){enriched.warnings=[...(Array.isArray(detail.warnings)?detail.warnings:[]),`Kandydat katalogowy: ${reference}${rarity?` • ${rarity}`:''}. Wymaga potwierdzenia.`];}
      return new Response(JSON.stringify({...payload,detail:enriched}),{status:response.status,statusText:response.statusText,headers:response.headers});
    }catch(error){console.warn('[catalog-candidate-enrichment]',error);return response;}
  };
})();
