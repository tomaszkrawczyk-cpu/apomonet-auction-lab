(()=>{
  if(!location.pathname.endsWith('collection.html')||!window.ApoMonet?.load)return;
  if(window.ApoCollectionStaleValuationGuard)return;
  const originalLoad=window.ApoMonet.load.bind(window.ApoMonet);
  const valuationFields=['value','estimatedValue','estimate','valuation','priceEstimate','marketValue','marketMedian','estimateLow','estimateHigh','estimatedPrice','priceRange'];
  const stale=coin=>Boolean(coin?.derivedDataStale||coin?.needsReanalysis||coin?.needsDetailedAnalysis&&coin?.derivedDataStaleReason);
  const scrub=coin=>{
    if(!stale(coin))return coin;
    const next={...coin,valuationSuppressedBecauseStale:true};
    for(const key of valuationFields)delete next[key];
    return next;
  };
  window.ApoMonet.load=()=>{
    const state=originalLoad();
    if(!state||!Array.isArray(state.coins))return state;
    return {...state,coins:state.coins.map(scrub)};
  };
  window.ApoCollectionStaleValuationGuard=Object.freeze({stale,scrub,valuationFields:[...valuationFields]});
})();
