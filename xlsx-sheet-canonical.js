(()=>{
  if(!window.ApoXLSXSheet?.xml)return;
  const original=window.ApoXLSXSheet.xml;
  const confirmedStatus=s=>['supported-by-stage2-variant-evidence','verified-curated','confirmed','verified'].includes(String(s||'').trim().toLowerCase());
  function normalize(c){
    if(!c||typeof c!=='object')return c;
    const d=c.detail&&typeof c.detail==='object'?c.detail:{};
    const stale=Boolean(c.derivedDataStale||c.needsReanalysis||c.valuationSuppressedBecauseStale);
    const confirmed=!stale&&(d.kopickiConfirmed===true||confirmedStatus(c.catalogEvidenceStatus||d.catalogEvidenceStatus||d.catalogVerification));
    const out={...c};
    if(!stale&&c.marketMedian!=null&&c.marketMedian!=='')out.estimatedPrice=c.marketMedian;
    if(confirmed&&!String(c.kopickiRarity||d.kopickiRarity||'').trim())out.rarity='';
    return out;
  }
  const xml=coins=>original((coins||[]).map(normalize));
  window.ApoXLSXSheet=Object.freeze({...window.ApoXLSXSheet,xml,normalize});
})();
