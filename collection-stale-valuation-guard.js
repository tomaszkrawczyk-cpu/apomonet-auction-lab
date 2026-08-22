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
  function patchCards(){
    if(!window.ApoCollectionValuation?.value)return;
    const byId=new Map((ApoMonet.load().coins||[]).map(c=>[String(c.id),c]));
    document.querySelectorAll('#coins .collection-coin').forEach(card=>{
      const id=card.querySelector('.coin-pick')?.dataset?.id||'';
      const coin=byId.get(String(id));if(!coin)return;
      const value=ApoCollectionValuation.value(coin),currency=ApoCollectionValuation.currency?.(coin)||'PLN';
      let node=card.querySelector('.coin-value');
      if(!value){if(node)node.remove();return}
      const label=window.ApoI18n?.tr?.('Szacunkowo')||'Szacunkowo';
      const text=`${label}: ${money(value,currency)}`;
      if(node){if(node.textContent!==text)node.textContent=text;return}
      const copy=card.querySelector('.coin-copy');if(!copy)return;
      node=document.createElement('span');node.className='coin-value';node.textContent=text;copy.appendChild(node);
    });
  }
  function installSummaryOverride(){
    const button=document.getElementById('valueBtn'),box=document.getElementById('valueBox');if(!button||!box||!window.ApoCollectionValuation?.summary)return;
    setTimeout(()=>{button.onclick=()=>{const list=ApoMonet.load().coins||[],summary=ApoCollectionValuation.summary(list);box.hidden=false;if(!list.length){box.innerHTML='<h2>Wartość kolekcji</h2><p>Najpierw dodaj monety do kolekcji.</p>';return}const total=summary.currencies.length?summary.currencies.map(c=>money(summary.groups[c],c)).join(' + '):'—';box.innerHTML=`<span class="eyebrow">Szacunkowa wartość</span><div class="value-total">${total}</div><div class="value-grid"><div class="value-stat"><small>Monety w kolekcji</small><strong>${list.length}</strong></div><div class="value-stat"><small>Ze świeżą wyceną</small><strong>${summary.valuedCount}</strong></div><div class="value-stat"><small>Bez świeżej wyceny</small><strong>${summary.unvaluedCount+summary.staleCount}</strong></div></div>${summary.currencies.length>1?'<div class="value-note">Różne waluty pokazujemy osobno i nie sumujemy ich bez przeliczenia.</div>':''}${summary.staleCount?`<div class="value-note">${summary.staleCount} rekordów pominięto, ponieważ wymagają ponownej analizy po korekcie.</div>`:''}<div class="value-note">To suma świeżych zapisanych wycen, a nie gwarantowana cena sprzedaży.</div>`}},0);
  }
  function installCardGuard(){
    const root=document.getElementById('coins');if(!root)return;patchCards();
    let scheduled=false;new MutationObserver(()=>{if(scheduled)return;scheduled=true;queueMicrotask(()=>{scheduled=false;patchCards()})}).observe(root,{childList:true,subtree:true});
    ['languagechange','apo-language-changed','apomonet:language-change'].forEach(event=>addEventListener(event,patchCards));
  }
  window.ApoCollectionStaleValuationGuard=Object.freeze({stale,scrub,valuationFields:[...valuationFields],patchCards});
  const init=()=>{installSummaryOverride();installCardGuard()};
  document.readyState==='loading'?addEventListener('DOMContentLoaded',init):init();
})();
