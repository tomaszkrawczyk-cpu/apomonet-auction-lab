(()=>{
  if(!location.pathname.endsWith('export.html'))return;
  if(!window.ApoMonet?.load)return;
  const originalLoad=window.ApoMonet.load.bind(window.ApoMonet);
  const clean=v=>String(v??'').trim();
  const CONFIRMED=new Set(['supported-by-stage2-variant-evidence','verified-curated','confirmed','verified']);
  const STALE_MARKET_FIELDS=['estimatedPrice','marketMedian','priceRange','estimateLow','estimateHigh','estimatedValue','valuation','marketValue'];
  const normalize=coin=>{
    if(!coin||typeof coin!=='object')return coin;
    const detail=coin.detail&&typeof coin.detail==='object'?coin.detail:{};
    const stale=Boolean(coin.derivedDataStale||coin.needsReanalysis);
    const status=stale?'':clean(detail.catalogEvidenceStatus||detail.catalogVerification||coin.catalogEvidenceStatus).toLowerCase();
    const confirmed=!stale&&(detail.kopickiConfirmed===true||CONFIRMED.has(status));
    const candidate=!stale&&detail.catalogCandidate&&typeof detail.catalogCandidate==='object'?detail.catalogCandidate:{};
    const confirmedReference=confirmed?clean(coin.kopickiReference||detail.kopickiReference):'';
    const confirmedRarity=confirmed?clean(coin.kopickiRarity||detail.kopickiRarity):'';
    const candidateReference=!stale&&!confirmed?clean(candidate.reference||coin.kopickiReference||detail.kopickiReference):'';
    const candidateRarity=!stale&&!confirmed?clean(candidate.rarity||coin.kopickiRarity||detail.kopickiRarity):'';
    const candidateConfidence=!stale&&!confirmed?(Number(candidate.confidence||0)||0):0;
    const output={
      ...coin,
      variant:coin.variant||detail.variant||'',
      kopickiReference:confirmedReference,
      kopickiRarity:confirmedRarity,
      catalogEvidenceStatus:stale?'stale-after-identity-correction':(confirmed?(status||'confirmed'):(status||'unconfirmed')),
      kopickiCandidate:candidateReference,
      kopickiCandidateRarity:candidateRarity,
      kopickiCandidateConfidence:candidateConfidence,
      catalogCandidateReference:candidateReference,
      catalogCandidateRarity:candidateRarity,
      catalogCandidateConfidence:candidateConfidence,
      fullDescription:coin.fullDescription||coin.description||detail.fullDescription||detail.description||'',
    };
    if(stale){
      for(const key of STALE_MARKET_FIELDS)delete output[key];
      output.valuationSuppressedBecauseStale=true;
      output.valuationNote=clean(coin.derivedDataStaleReason)||'Wycena i dane katalogowe wymagają ponownej analizy po korekcie identyfikacji.';
    }
    return output;
  };
  window.ApoMonet.load=()=>{
    const state=originalLoad();
    if(!state||!Array.isArray(state.coins))return state;
    return {...state,coins:state.coins.map(normalize)};
  };
  window.ApoExportRecordView={normalize};
})();
