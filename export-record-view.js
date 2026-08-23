(()=>{
  if(!location.pathname.endsWith('export.html'))return;
  if(!window.ApoMonet?.load)return;
  const originalLoad=window.ApoMonet.load.bind(window.ApoMonet);
  const clean=v=>String(v??'').trim();
  const lang=()=>window.ApoLanguageRegistry?.current?.()||window.ApoI18n?.current?.()||(typeof localStorage!=='undefined'?localStorage.getItem('apomonet_language_v2'):'')||'pl';
  const STALE_NOTE={pl:'Wycena, literatura i dane katalogowe wymagają ponownej analizy po korekcie identyfikacji.',en:'Valuation, literature and catalog data require re-analysis after the identification correction.',de:'Bewertung, Literatur- und Katalogdaten müssen nach der Identifikationskorrektur erneut analysiert werden.',fr:'L’estimation, la littérature et les données de catalogue doivent être réanalysées après la correction de l’identification.'};
  const PRIVATE_FIELDS=['rawAI','userAdditionalInfo','acceptedAt','updatedAt','createdAt','previousDetailAudit','derivedStateIdentityKey','derivedStateInvalidatedAt','recordMigratedAt','recordMigrationVersion','legacyDerivedDataQuarantined'];
  const CONFIRMED=new Set(['supported-by-stage2-variant-evidence','verified-curated','confirmed','verified']);
  const STALE_MARKET_FIELDS=['estimatedPrice','marketMedian','priceRange','estimateLow','estimateHigh','estimatedValue','valuation','marketValue','priceEstimate','estimate','marketCurrency','valuationCurrency','valuationConfidence','valuationUpdatedAt','auctionRecords10y','auctionRecordCount10y','auctionMarketSnapshot','auctionStrictMatches10y','auctionMarketIdentityKey','marketReanalysisCompletedAt'];
  const STALE_LITERATURE_FIELDS=['tyszkiewiczReference','tyszkiewiczRarity','tyszkiewiczValue','tyszkiewiczValuation','tyszkiewiczEstimate','tyszkiewiczNote','tyszkiewiczEvidence','tyszkiewiczSource','parchimowiczReference','parchimowiczRarity','parchimowiczValuation','parchimowiczEstimate','parchimowiczNote','parchimowiczEvidence','parchimowiczSource','specialistReferences','literatureReferences','literatureValuation','literatureEvidence','literatureNotes'];
  const originalPhoto=(coin,side)=>side==='obverse'?clean(coin?.obverseImage||coin?.image||coin?.img):clean(coin?.reverseImage);
  const exportPhoto=(coin,side)=>{if(coin?.albumPhotoMode==='none')return'';const sideMode=side==='obverse'?(coin?.albumObversePhotoMode||(coin?.albumPhotoMode==='cut'?'cut':'original')):(coin?.albumReversePhotoMode||(coin?.albumPhotoMode==='cut'?'cut':'original'));if(sideMode==='cut'&&Number(coin.albumPhotoPrepVersion||0)>=2){const cut=side==='obverse'?clean(coin.albumObverseImage):clean(coin.albumReverseImage);return cut||originalPhoto(coin,side)}return originalPhoto(coin,side)};
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
    const output={...coin,obverseImage:exportPhoto(coin,'obverse'),reverseImage:exportPhoto(coin,'reverse'),variant:coin.variant||detail.variant||'',kopickiReference:confirmedReference,kopickiRarity:confirmedRarity,catalogEvidenceStatus:stale?'stale-after-identity-correction':(confirmed?(status||'confirmed'):(status||'unconfirmed')),kopickiCandidate:candidateReference,kopickiCandidateRarity:candidateRarity,kopickiCandidateConfidence:candidateConfidence,catalogCandidateReference:candidateReference,catalogCandidateRarity:candidateRarity,catalogCandidateConfidence:candidateConfidence,fullDescription:coin.fullDescription||coin.description||detail.fullDescription||detail.description||''};
    for(const key of PRIVATE_FIELDS)delete output[key];
    if(stale){for(const key of [...STALE_MARKET_FIELDS,...STALE_LITERATURE_FIELDS])delete output[key];output.valuationSuppressedBecauseStale=true;output.literatureSuppressedBecauseStale=true;output.valuationNote=clean(coin.derivedDataStaleReason)||(STALE_NOTE[lang()]||STALE_NOTE.en||STALE_NOTE.pl)}
    return output;
  };
  window.ApoMonet.load=()=>{const state=originalLoad();if(!state||!Array.isArray(state.coins))return state;return {...state,coins:state.coins.map(normalize)}};
  window.ApoExportRecordView={normalize,exportPhoto,PRIVATE_FIELDS};
})();
