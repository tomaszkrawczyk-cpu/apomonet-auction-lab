(()=>{
  if(!location.pathname.endsWith('analyze.html'))return;
  const readSession=()=>{try{return JSON.parse(sessionStorage.getItem('apomonetAnalysisSession')||'null')}catch{return null}};
  const comparable=value=>String(value??'').trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pl-PL');
  const correctionIdentityKey=coin=>['nominal','ruler','year','mint','metal'].map(key=>comparable(coin?.[key])).join('|');
  function refresh(){
    const s=readSession(),coin=s?.id&&window.ApoMonet?ApoMonet.getCoin(s.id):null;
    if(!coin?.userAccepted||!coin?.needsReanalysis||!window.ApoArchive?.valuation)return;
    const v=ApoArchive.valuation(coin,10,'PLN');
    const patch={id:coin.id,auctionRecords10y:v.count||0,auctionStrictMatches10y:v.strictCount||0,marketMedian:v.count?v.median:null,marketCurrency:v.currency||'PLN',priceRange:v.canEstimate?v.priceRange:'',valuationConfidence:v.quality||'none',valuationNote:v.note||'Brak wystarczających porównywalnych notowań dla poprawionej identyfikacji.',valuationUpdatedAt:new Date().toISOString(),auctionMarketIdentityKey:[coin.ruler,coin.nominal,coin.year,coin.mint,coin.variant].map(x=>String(x||'').trim().toLowerCase()).join('|'),correctionReanalysisIdentityKey:correctionIdentityKey(coin),needsReanalysis:false,derivedDataStale:false,derivedDataStaleReason:'',marketReanalysisCompletedAt:new Date().toISOString()};
    ApoMonet.upsertCoin(patch);
    window.dispatchEvent(new CustomEvent('apomonet:market-refreshed',{detail:{coinId:coin.id,count:v.count||0}}));
  }
  addEventListener('DOMContentLoaded',()=>setTimeout(refresh,180));
  addEventListener('apomonet:detail-complete',()=>setTimeout(refresh,50));
  addEventListener('apo-stage2-detail',()=>setTimeout(refresh,80));
})();
