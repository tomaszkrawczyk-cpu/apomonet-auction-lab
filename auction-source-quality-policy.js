(()=>{
  if(!window.ApoArchive||!window.ApoAuctionSourceQuality)return;
  const originalComparable=ApoArchive.comparable.bind(ApoArchive),originalValuationRows=ApoArchive.valuationRows.bind(ApoArchive);
  const median=vals=>{const a=[...vals].sort((x,y)=>x-y),m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2};
  const percentile=(vals,p)=>{const a=[...vals].sort((x,y)=>x-y);if(!a.length)return 0;const i=(a.length-1)*p,l=Math.floor(i),h=Math.ceil(i);return a[l]+(a[h]-a[l])*(i-l)};
  ApoArchive.comparable=(coin,years=10)=>originalComparable(coin,years).map(r=>ApoAuctionSourceQuality.enrich(r));
  ApoArchive.valuation=(coin,years=10,currency='PLN')=>{
    const rows=ApoArchive.comparable(coin,years).filter(r=>r.currency===currency);
    if(!rows.length)return{count:0,canEstimate:false,priceRange:'',currency,records:[],valuationRecordCount:0,valuationTier:'none',quality:'none',note:'Brak porównywalnych notowań.'};
    const eligible=rows.filter(r=>r.evidenceQuality==='strong'||r.evidenceQuality==='usable');
    const chosen=originalValuationRows(eligible,coin),basis=chosen.priceBasis||'';
    const values=chosen.rows.map(r=>ApoArchive.marketValue(r,basis)).filter(Boolean);
    const strongSourceCount=rows.filter(r=>r.evidenceQuality==='strong').length,usableSourceCount=rows.filter(r=>r.evidenceQuality==='usable').length,limitedSourceCount=rows.filter(r=>r.evidenceQuality==='limited'||r.evidenceQuality==='weak').length;
    if(!values.length)return{count:rows.length,canEstimate:false,priceRange:'',currency,records:rows,valuationRecords:[],valuationRecordCount:0,valuationTier:chosen.tier||'insufficient-source-quality',priceBasis:basis,quality:'limited',strongSourceCount,usableSourceCount,limitedSourceCount,note:'Są porównywalne notowania, ale za mało dobrze udokumentowanych rekordów źródłowych do wiarygodnej wyceny.'};
    const low=Math.round(percentile(values,.1)),high=Math.round(percentile(values,.9)),med=Math.round(median(values));
    const basisLabel=basis==='hammer'?'cenach młotkowych':basis==='realized'?'cenach realizacji':basis==='total'?'cenach całkowitych':'porównywalnych cenach';
    return{count:rows.length,low,high,median:med,q1:Math.round(percentile(values,.25)),q3:Math.round(percentile(values,.75)),currency,records:rows,valuationRecords:chosen.rows,valuationRecordCount:chosen.rows.length,valuationTier:chosen.tier,priceBasis:basis,quality:'usable',strongSourceCount,usableSourceCount,limitedSourceCount,canEstimate:true,priceRange:`${low}–${high} ${currency}`,note:`Widełki oparte wyłącznie na ${chosen.rows.length} dobrze udokumentowanych rekordach źródłowych (${basisLabel}) z ostatnich ${years} lat. Słabsze rekordy pozostają widoczne informacyjnie, ale nie wpływają na wycenę.`};
  };
})();
