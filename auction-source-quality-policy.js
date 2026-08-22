(()=>{
  if(!window.ApoArchive||!window.ApoAuctionSourceQuality)return;
  const originalComparable=ApoArchive.comparable.bind(ApoArchive),originalValuationRows=ApoArchive.valuationRows.bind(ApoArchive);
  const median=vals=>{const a=[...vals].sort((x,y)=>x-y),m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2};
  const percentile=(vals,p)=>{const a=[...vals].sort((x,y)=>x-y);if(!a.length)return 0;const i=(a.length-1)*p,l=Math.floor(i),h=Math.ceil(i);return a[l]+(a[h]-a[l])*(i-l)};
  const enrich=r=>{const q=ApoAuctionSourceQuality.enrich(r);return window.ApoAuctionSourceFreshness?.enrich?ApoAuctionSourceFreshness.enrich(q):q};
  ApoArchive.comparable=(coin,years=10)=>originalComparable(coin,years).map(enrich);
  ApoArchive.valuation=(coin,years=10,currency='PLN')=>{
    const rows=ApoArchive.comparable(coin,years).filter(r=>r.currency===currency);
    if(!rows.length)return{count:0,canEstimate:false,priceRange:'',currency,records:[],valuationRecordCount:0,valuationTier:'none',quality:'none',note:'Brak porównywalnych notowań.'};
    // Historical sale facts do not expire merely because they were imported long ago. Freshness is audit metadata.
    // A record may drive valuation only when its direct source and core sale facts are complete.
    const eligible=rows.filter(r=>r.evidenceCompleteCore&&(r.evidenceQuality==='strong'||r.evidenceQuality==='usable'));
    const chosen=originalValuationRows(eligible,coin),basis=chosen.priceBasis||'';
    const values=chosen.rows.map(r=>ApoArchive.marketValue(r,basis)).filter(Boolean);
    const strongSourceCount=rows.filter(r=>r.evidenceQuality==='strong'&&r.evidenceCompleteCore).length,usableSourceCount=rows.filter(r=>r.evidenceQuality==='usable'&&r.evidenceCompleteCore).length,limitedSourceCount=rows.length-strongSourceCount-usableSourceCount;
    const staleSourceCount=rows.filter(r=>r.sourceFreshness==='stale'||r.sourceFreshness==='unknown').length;
    if(!values.length)return{count:rows.length,canEstimate:false,priceRange:'',currency,records:rows,valuationRecords:[],valuationRecordCount:0,valuationTier:chosen.tier||'insufficient-source-quality',priceBasis:basis,quality:'limited',strongSourceCount,usableSourceCount,limitedSourceCount,staleSourceCount,note:'Są porównywalne notowania, ale za mało kompletnie udokumentowanych rekordów źródłowych do wiarygodnej wyceny. Rekord bez bezpośredniego źródła pozostaje informacyjny i nie wpływa na widełki.'};
    const low=Math.round(percentile(values,.1)),high=Math.round(percentile(values,.9)),med=Math.round(median(values));
    const basisLabel=basis==='hammer'?'cenach młotkowych':basis==='realized'?'cenach realizacji':basis==='total'?'cenach całkowitych':'porównywalnych cenach';
    const auditNote=staleSourceCount?` ${staleSourceCount} rekordów ma starą lub nieznaną datę ostatniej weryfikacji źródła; pozostają historycznymi faktami sprzedaży, ale warto ponownie sprawdzić ich linki przed publikacją profesjonalnego raportu.`:'';
    return{count:rows.length,low,high,median:med,q1:Math.round(percentile(values,.25)),q3:Math.round(percentile(values,.75)),currency,records:rows,valuationRecords:chosen.rows,valuationRecordCount:chosen.rows.length,valuationTier:chosen.tier,priceBasis:basis,quality:chosen.tier==='strict'||chosen.tier==='strict-condition'?'strong':'usable',strongSourceCount,usableSourceCount,limitedSourceCount,staleSourceCount,canEstimate:true,priceRange:`${low}–${high} ${currency}`,note:`Widełki oparte wyłącznie na ${chosen.rows.length} kompletnie udokumentowanych rekordach źródłowych (${basisLabel}) z ostatnich ${years} lat. Słabsze lub niepełne rekordy pozostają widoczne informacyjnie, ale nie wpływają na wycenę.${auditNote}`};
  };
})();
