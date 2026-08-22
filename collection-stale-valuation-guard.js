(()=>{
  if(!location.pathname.endsWith('collection.html')||!window.ApoMonet?.load)return;
  if(window.ApoCollectionStaleValuationGuard)return;
  const originalLoad=window.ApoMonet.load.bind(window.ApoMonet);
  const valuationFields=['value','estimatedValue','estimate','valuation','priceEstimate','marketValue','marketMedian','estimateLow','estimateHigh','estimatedPrice','priceRange'];
  const stale=coin=>Boolean(coin?.derivedDataStale||coin?.needsReanalysis||coin?.needsDetailedAnalysis&&coin?.derivedDataStaleReason);
  const scrub=coin=>{
    if(stale(coin)){
      const next={...coin,valuationSuppressedBecauseStale:true};
      for(const key of valuationFields)delete next[key];
      return next;
    }
    const marketMedian=Number(coin?.marketMedian);
    if(Number.isFinite(marketMedian)&&marketMedian>0)return{...coin,value:marketMedian,collectionValuationSource:'marketMedian'};
    const low=Number(coin?.estimateLow),high=Number(coin?.estimateHigh);
    if(Number.isFinite(low)&&low>0&&Number.isFinite(high)&&high>0)return{...coin,value:(low+high)/2,collectionValuationSource:'estimateRange'};
    return coin;
  };
  window.ApoMonet.load=()=>{
    const state=originalLoad();
    if(!state||!Array.isArray(state.coins))return state;
    return {...state,coins:state.coins.map(scrub)};
  };
  function money(v,c){try{return new Intl.NumberFormat('pl-PL',{style:'currency',currency:c||'PLN',maximumFractionDigits:0}).format(v||0)}catch{return Math.round(v||0)+' '+(c||'PLN')}}
  function installSummaryOverride(){
    const button=document.getElementById('valueBtn'),box=document.getElementById('valueBox');if(!button||!box||!window.ApoCollectionValuation?.summary)return;
    setTimeout(()=>{button.onclick=()=>{const list=ApoMonet.load().coins||[],summary=ApoCollectionValuation.summary(list);box.hidden=false;if(!list.length){box.innerHTML='<h2>Wartość kolekcji</h2><p>Najpierw dodaj monety do kolekcji.</p>';return}const total=summary.currencies.length?summary.currencies.map(c=>money(summary.groups[c],c)).join(' + '):'—';box.innerHTML=`<span class="eyebrow">Szacunkowa wartość</span><div class="value-total">${total}</div><div class="value-grid"><div class="value-stat"><small>Monety w kolekcji</small><strong>${list.length}</strong></div><div class="value-stat"><small>Ze świeżą wyceną</small><strong>${summary.valuedCount}</strong></div><div class="value-stat"><small>Bez świeżej wyceny</small><strong>${summary.unvaluedCount+summary.staleCount}</strong></div></div>${summary.currencies.length>1?'<div class="value-note">Różne waluty pokazujemy osobno i nie sumujemy ich bez przeliczenia.</div>':''}${summary.staleCount?`<div class="value-note">${summary.staleCount} rekordów pominięto, ponieważ wymagają ponownej analizy po korekcie.</div>`:''}<div class="value-note">To suma świeżych zapisanych wycen, a nie gwarantowana cena sprzedaży.</div>`}},0);
  }
  window.ApoCollectionStaleValuationGuard=Object.freeze({stale,scrub,valuationFields:[...valuationFields]});
  document.readyState==='loading'?addEventListener('DOMContentLoaded',installSummaryOverride):installSummaryOverride();
})();
