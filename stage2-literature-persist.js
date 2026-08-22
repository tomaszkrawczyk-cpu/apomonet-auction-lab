(()=>{
  if(!location.pathname.endsWith('analyze.html'))return;
  const known=v=>{
    if(window.ApoCanonicalRecordSentinels?.isUnknown)return !ApoCanonicalRecordSentinels.isUnknown(v);
    const n=String(v??'').trim().toLowerCase();
    return !!n&&!['nie ustalono','unknown','unbekannt','inconnu','not determined','nicht bestimmt','do potwierdzenia'].includes(n);
  };
  function sessionId(){try{return JSON.parse(sessionStorage.getItem('apomonetAnalysisSession')||'null')?.id||''}catch{return''}}
  addEventListener('apo-stage2-detail',event=>{
    const id=sessionId();if(!id||!window.ApoMonet)return;
    const current=ApoMonet.getCoin(id);if(!current)return;
    const detail=event?.detail?.detail||{};
    const refs=(event?.detail?.literature?.references||[]).filter(r=>known(r?.value)||known(r?.historicalValue));
    const by=id=>refs.find(r=>String(r?.id||'').toLowerCase()===id);
    const tys=by('tyszkiewicz'),par=by('parchimowicz');
    const next={...current,detail,analysisLevel:'detailed',needsDetailedAnalysis:false};
    if(current.needsReanalysis){next.derivedDataStale=true;next.derivedDataStaleReason='Analiza szczegółowa została odświeżona; trwa ponowne dopasowanie notowań i wyceny do zaakceptowanej identyfikacji.'}else{next.derivedDataStale=false;delete next.derivedDataStaleReason}
    if(known(detail.kopickiReference)&&detail.catalogEvidenceStatus==='supported-by-stage2-variant-evidence')next.kopickiReference=detail.kopickiReference;else if(detail.catalogEvidenceStatus==='unconfirmed'||!known(detail.kopickiReference))delete next.kopickiReference;
    if(known(detail.kopickiRarity)&&detail.catalogEvidenceStatus==='supported-by-stage2-variant-evidence')next.kopickiRarity=detail.kopickiRarity;else if(detail.catalogEvidenceStatus==='unconfirmed'||!known(detail.kopickiRarity))delete next.kopickiRarity;
    if(tys){if(known(tys.value))next.tyszkiewiczReference=tys.value;else delete next.tyszkiewiczReference;if(known(tys.historicalValue))next.tyszkiewiczValue=tys.historicalValue;else delete next.tyszkiewiczValue}else{delete next.tyszkiewiczReference;delete next.tyszkiewiczValue}
    if(par&&known(par.value))next.parchimowiczReference=par.value;else delete next.parchimowiczReference;
    next.literatureEvidence={method:event?.detail?.literature?.policyMethod||'evidence-based',confirmedAt:new Date().toISOString(),references:refs.map(r=>({id:r.id,label:r.label,value:known(r.value)?r.value:'',source:r.source||'',historicalValue:known(r.historicalValue)?r.historicalValue:'',historicalValueOnly:Boolean(r.historicalValueOnly)}))};
    ApoMonet.upsertCoin(next);
  });
})();
