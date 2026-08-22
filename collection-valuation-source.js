(()=>{
  function currency(coin){return String(coin?.marketCurrency||coin?.valuationCurrency||'PLN').trim().toUpperCase()||'PLN'}
  function value(coin){
    if(!coin||coin.derivedDataStale||coin.needsReanalysis||coin.valuationSuppressedBecauseStale)return 0;
    const direct=[coin.marketMedian,coin.estimatedPrice,coin.estimatedValue,coin.marketValue,coin.valuation,coin.priceEstimate,coin.estimate,coin.value]
      .map(Number).find(v=>Number.isFinite(v)&&v>0);
    if(direct)return direct;
    const low=Number(coin.estimateLow),high=Number(coin.estimateHigh);
    if(Number.isFinite(low)&&low>0&&Number.isFinite(high)&&high>0)return(low+high)/2;
    return 0;
  }
  function summary(coins){
    const groups={};let staleCount=0,unvaluedCount=0;
    for(const coin of coins||[]){
      const v=value(coin);if(!v){if(coin?.derivedDataStale||coin?.needsReanalysis||coin?.valuationSuppressedBecauseStale)staleCount++;else unvaluedCount++;continue}
      const c=currency(coin);groups[c]=(groups[c]||0)+v;
    }
    const currencies=Object.keys(groups);
    return{groups,currencies,staleCount,unvaluedCount,valuedCount:(coins||[]).length-staleCount-unvaluedCount,canShowSingleTotal:currencies.length===1,total:currencies.length===1?groups[currencies[0]]:null,currency:currencies.length===1?currencies[0]:''};
  }
  window.ApoCollectionValuation=Object.freeze({value,currency,summary});
})();
