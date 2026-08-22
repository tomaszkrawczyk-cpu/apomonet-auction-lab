(()=>{
  if(!location.pathname.endsWith('analyze.html'))return;
  const readSession=()=>{try{return JSON.parse(sessionStorage.getItem('apomonetAnalysisSession')||'null')}catch{return null}};
  function refresh(){
    const s=readSession(),coin=s?.id&&window.ApoMonet?ApoMonet.getCoin(s.id):null;
    if(!coin?.userAccepted||!coin?.needsReanalysis||!window.ApoArchive?.valuation)return;
    const v=ApoArchive.valuation(coin,10,'PLN');
    const patch={id:coin.id,auctionRecords10y:v.count||0,auctionStrictMatches10y:v.strictCount||0,marketMedian:v.count?v.median:null,marketCurrency:v.currency||'PLN',priceRange:v.canEstimate?v.priceRange:'',valuationConfidence:v.quality||'none',valuationNote:v.note||'Brak wystarczających porównywalnych notowań dla poprawionej identyfikacji.',valuationUpdatedAt:new Date().toISOString(),auctionMarketIdentityKey:[coin.ruler,coin.nominal,coin.year,coin.mint,coin.variant].map(x=>String(x||'').trim().toLowerCase()).join('|'),needsReanalysis:false,derivedDataStale:false,marketReanalysisCompletedAt:new Date().toISOString()};
    delete patch.derivedDataStaleReason;
    ApoMonet.upsertCoin(patch);
    window.dispatchEvent(new CustomEvent('apomonet:market-refreshed',{detail:{coinId:coin.id,count:v.count||0}}));
  }
  addEventListener('DOMContentLoaded',()=>setTimeout(refresh,180));
  addEventListener('apomonet:detail-complete',()=>setTimeout(refresh,50));
  addEventListener('apo-stage2-detail',()=>setTimeout(refresh,80));
})();
