(()=>{
  const median=vals=>{const a=[...vals].sort((x,y)=>x-y),m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2};
  const percentile=(vals,p)=>{const a=[...vals].sort((x,y)=>x-y);if(!a.length)return 0;const i=(a.length-1)*p,l=Math.floor(i),h=Math.ceil(i);return a[l]+(a[h]-a[l])*(i-l)};
  function install(){
    if(!window.ApoArchive?.valuation||!window.ApoAuctionOutliers?.filter||ApoArchive.__outlierPolicyInstalled)return;
    const baseValuation=ApoArchive.valuation.bind(ApoArchive);
    ApoArchive.valuation=function(coin,years=10,currency='PLN'){
      const v=baseValuation(coin,years,currency);
      if(!v?.canEstimate||!Array.isArray(v.valuationRecords)||!v.valuationRecords.length||!v.priceBasis)return{...v,outliers:[],outlierMethod:'none',outlierReason:'Brak wystarczającej próbki do filtrowania odstających cen.'};
      const filtered=ApoAuctionOutliers.filter(v.valuationRecords,v.priceBasis),rows=filtered.rows||[],outliers=filtered.outliers||[];
      const values=rows.map(r=>ApoArchive.marketValue(r,v.priceBasis)).filter(Boolean);
      if(!values.length)return{...v,outliers:[],outlierMethod:'none',outlierReason:'Filtr odstających cen nie został zastosowany.'};
      const low=Math.round(percentile(values,.1)),high=Math.round(percentile(values,.9)),med=Math.round(median(values));
      const note=outliers.length?`${v.note} Wyłączono ${outliers.length} nietypowych wyników cenowych z obliczania widełek; pozostają widoczne jako fakty aukcyjne.`:v.note;
      return{...v,low,high,median:med,q1:Math.round(percentile(values,.25)),q3:Math.round(percentile(values,.75)),priceRange:`${low}–${high} ${currency}`,valuationRecords:rows,valuationRecordCount:rows.length,outliers,outlierIds:outliers.map(r=>r.id),outlierMethod:filtered.method||'none',outlierReason:filtered.reason||'',preOutlierCount:v.valuationRecords.length,note};
    };
    ApoArchive.__outlierPolicyInstalled=true;
  }
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',install):install();
})();
