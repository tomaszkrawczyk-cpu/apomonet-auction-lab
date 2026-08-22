(()=>{
  const comparable=value=>String(value??'').trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pl-PL');
  const identityKey=coin=>['nominal','ruler','year','mint','metal','variant'].map(key=>comparable(coin?.[key])).join('|');
  const derivedFields=['detail','kopickiReference','kopickiRarity','catalogEvidenceStatus','catalogVerification','catalogCandidate','catalogCandidateReference','catalogCandidateRarity','catalogCandidateConfidence','kopickiCandidate','kopickiCandidateRarity','kopickiCandidateConfidence','tyszkiewiczReference','tyszkiewiczRarity','tyszkiewiczValue','tyszkiewiczValuation','tyszkiewiczEstimate','tyszkiewiczNote','tyszkiewiczEvidence','tyszkiewiczSource','parchimowiczReference','parchimowiczRarity','parchimowiczValuation','parchimowiczEstimate','parchimowiczNote','parchimowiczEvidence','parchimowiczSource','specialistReferences','literatureReferences','literatureValuation','literatureEvidence','literatureNotes','auctionRecords10y','auctionRecordCount10y','auctionMarketSnapshot','auctionStrictMatches10y','marketMedian','marketCurrency','priceRange','valuationConfidence','valuationUpdatedAt','estimateLow','estimateHigh','estimatedPrice'];
  function drifted(coin){return Boolean(coin?.userAccepted&&coin?.marketReanalysisCompletedAt&&coin?.correctionReanalysisIdentityKey&&coin.correctionReanalysisIdentityKey!==identityKey(coin));}
  function invalidate(coin){
    if(!drifted(coin))return coin;
    const next={...coin};for(const key of derivedFields)delete next[key];
    next.analysisLevel='basic';next.needsReanalysis=true;next.needsDetailedAnalysis=true;next.derivedDataStale=true;
    next.derivedDataStaleReason='Dane pochodne unieważniono, ponieważ zaakceptowana identyfikacja zmieniła się po ostatniej zakończonej reanalizie.';
    next.valuationNote='Wycena, literatura i notowania wymagają ponownego dopasowania do najnowszej identyfikacji.';
    next.derivedStateInvalidatedAt=new Date().toISOString();next.identityDriftDetectedAt=next.derivedStateInvalidatedAt;
    return next;
  }
  function install(){if(!window.ApoMonet?.upsertCoin||ApoMonet.__resolvedIdentityDriftGuard)return;const original=ApoMonet.upsertCoin;ApoMonet.upsertCoin=function(patch){const current=patch?.id?ApoMonet.getCoin(patch.id):null;const merged=current?{...current,...patch}:patch;return original.call(ApoMonet,invalidate(merged));};ApoMonet.__resolvedIdentityDriftGuard=true;}
  window.ApoResolvedIdentityDrift=Object.freeze({identityKey,drifted,invalidate,derivedFields:[...derivedFields]});
  document.readyState==='loading'?addEventListener('DOMContentLoaded',install):install();
})();