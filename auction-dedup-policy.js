(()=>{
  const median=vals=>{const a=[...vals].sort((x,y)=>x-y),m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2};
  const percentile=(vals,p)=>{const a=[...vals].sort((x,y)=>x-y);if(!a.length)return 0;const i=(a.length-1)*p,l=Math.floor(i),h=Math.ceil(i);return a[l]+(a[h]-a[l])*(i-l)};
  function install(){
    if(!window.ApoArchive?.comparable||!window.ApoArchive?.valuationRows||!window.ApoAuctionDedup?.dedupe||ApoArchive.__dedupInstalled)return;
    const baseComparable=ApoArchive.comparable.bind(ApoArchive);
    ApoArchive.comparable=function(coin,years=10){
      const raw=baseComparable(coin,years),d=ApoAuctionDedup.dedupe(raw);
      return d.rows.map(r=>({...r,deduplicatedMirrorCount:Math.max(0,(r.duplicateSourceCount||1)-1)}));
    };
    ApoArchive.valuation=function(coin,years=10,currency='PLN'){
      const raw=baseComparable(coin,years),d=ApoAuctionDedup.dedupe(raw),records=d.rows.filter(r=>r.currency===currency);
      const strictCount=records.filter(r=>r.quality==='strict').length,goodCount=records.filter(r=>r.quality==='good').length,indicativeCount=records.filter(r=>r.quality==='indicative').length;
      if(!records.length)return{count:0,low:0,high:0,median:0,q1:0,q3:0,currency,quality:'none',records:[],strictCount,goodCount,indicativeCount,valuationRecordCount:0,valuationTier:'none',priceBasis:'',periodYears:years,canEstimate:false,duplicateRecordCount:d.removedCount||0,note:'Brak porównywalnych notowań.'};
      const chosen=ApoArchive.valuationRows(records,coin),valuationRecords=chosen.rows||[],vals=valuationRecords.map(r=>ApoArchive.marketValue(r,chosen.priceBasis)).filter(Boolean);
      const quality=chosen.tier?.startsWith('strict-condition')||chosen.tier==='strict'?'strong':chosen.tier?.startsWith('strict+good')?'usable':'limited';
      const base={count:records.length,low:vals.length?Math.round(percentile(vals,.1)):0,high:vals.length?Math.round(percentile(vals,.9)):0,median:vals.length?Math.round(median(vals)):0,q1:vals.length?Math.round(percentile(vals,.25)):0,q3:vals.length?Math.round(percentile(vals,.75)):0,currency,quality,records,valuationRecords,valuationRecordCount:valuationRecords.length,valuationTier:chosen.tier||'none',priceBasis:chosen.priceBasis||'',strictCount,goodCount,indicativeCount,conditionBand:ApoArchive.gradeBand?.(coin)||'',periodYears:years,duplicateRecordCount:d.removedCount||0};
      const duplicateNote=d.removedCount?` Wykryto ${d.removedCount} lustrzanych duplikatów tej samej sprzedaży; każdy fakt aukcyjny liczony jest tylko raz.`:'';
      if(quality==='limited')return{...base,canEstimate:false,priceRange:'',note:(base.conditionBand?'Są podobne notowania, ale za mało porównywalnych egzemplarzy o zbliżonym stanie i jednolitej podstawie ceny do wiarygodnej wyceny.':'Są podobne notowania, ale za mało mocno dopasowanych rekordów z jednolitą podstawą ceny do wiarygodnej wyceny.')+duplicateNote};
      const basisLabel=base.priceBasis==='hammer'?'cenach młotkowych':base.priceBasis==='realized'?'cenach realizacji':base.priceBasis==='total'?'cenach całkowitych':'porównywalnych cenach';
      const evidence=base.valuationTier.includes('condition')?'mocnych dopasowaniach o zbliżonym stanie zachowania':base.valuationTier==='strict'?'ścisłych dopasowaniach':'ścisłych i dobrych dopasowaniach';
      return{...base,canEstimate:true,priceRange:`${base.low}–${base.high} ${currency}`,note:`Widełki oparte na ${base.valuationRecordCount} ${evidence}, liczonych na ${basisLabel}, z ostatnich ${years} lat. Łącznie znaleziono ${base.count} unikalnych porównywalnych rekordów.`+duplicateNote};
    };
    ApoArchive.__dedupInstalled=true;
  }
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',install):install();
})();
