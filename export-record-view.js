(()=>{
  if(!location.pathname.endsWith('export.html'))return;
  if(!window.ApoMonet?.load)return;
  const originalLoad=window.ApoMonet.load.bind(window.ApoMonet);
  const clean=v=>String(v??'').trim();
  const normalize=coin=>{
    if(!coin||typeof coin!=='object')return coin;
    const detail=coin.detail&&typeof coin.detail==='object'?coin.detail:{};
    const status=clean(detail.catalogEvidenceStatus||coin.catalogEvidenceStatus);
    const confirmed=status==='supported-by-stage2-variant-evidence';
    const candidate=detail.catalogCandidate&&typeof detail.catalogCandidate==='object'?detail.catalogCandidate:{};
    const confirmedReference=confirmed?clean(coin.kopickiReference||detail.kopickiReference):'';
    const confirmedRarity=confirmed?clean(coin.kopickiRarity||detail.kopickiRarity):'';
    const candidateReference=!confirmed?clean(candidate.reference||coin.kopickiReference||detail.kopickiReference):'';
    const candidateRarity=!confirmed?clean(candidate.rarity||coin.kopickiRarity||detail.kopickiRarity):'';
    const candidateConfidence=!confirmed?(Number(candidate.confidence||0)||0):0;
    return {
      ...coin,
      variant:coin.variant||detail.variant||'',
      kopickiReference:confirmedReference,
      kopickiRarity:confirmedRarity,
      catalogEvidenceStatus:status||'unconfirmed',
      // Canonical export schema used by PDF and XLSX.
      kopickiCandidate:candidateReference,
      kopickiCandidateRarity:candidateRarity,
      kopickiCandidateConfidence:candidateConfidence,
      // Backward-compatible aliases for older export consumers/tests.
      catalogCandidateReference:candidateReference,
      catalogCandidateRarity:candidateRarity,
      catalogCandidateConfidence:candidateConfidence,
      fullDescription:coin.fullDescription||coin.description||detail.fullDescription||detail.description||'',
    };
  };
  window.ApoMonet.load=()=>{
    const state=originalLoad();
    if(!state||!Array.isArray(state.coins))return state;
    return {...state,coins:state.coins.map(normalize)};
  };
  window.ApoExportRecordView={normalize};
})();
