(()=>{
  if(!location.pathname.endsWith('collection.html'))return;
  function value(coin){
    if(!coin||coin.derivedDataStale||coin.needsReanalysis||coin.valuationSuppressedBecauseStale)return 0;
    const direct=[coin.marketMedian,coin.estimatedPrice,coin.estimatedValue,coin.marketValue,coin.valuation,coin.priceEstimate,coin.estimate,coin.value]
      .map(Number).find(v=>Number.isFinite(v)&&v>0);
    if(direct)return direct;
    const low=Number(coin.estimateLow),high=Number(coin.estimateHigh);
    if(Number.isFinite(low)&&low>0&&Number.isFinite(high)&&high>0)return(low+high)/2;
    return 0;
  }
  window.ApoCollectionValuation=Object.freeze({value});
})();
