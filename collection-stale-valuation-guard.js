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
  window.ApoCollectionStaleValuationGuard=Object.freeze({stale,scrub,valuationFields:[...valuationFields]});
})();
