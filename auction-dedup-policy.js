(()=>{
  function install(){
    if(!window.ApoArchive?.comparable||!window.ApoAuctionDedup?.dedupe||ApoArchive.__dedupInstalled)return;
    const baseComparable=ApoArchive.comparable.bind(ApoArchive),baseValuation=ApoArchive.valuation?.bind(ApoArchive);
    ApoArchive.comparable=function(coin,years=10){const raw=baseComparable(coin,years),d=ApoAuctionDedup.dedupe(raw);return d.rows.map(r=>({...r,deduplicatedMirrorCount:Math.max(0,(r.duplicateSourceCount||1)-1)}))};
    if(baseValuation)ApoArchive.valuation=function(coin,years=10,currency='PLN'){const v=baseValuation(coin,years,currency);const d=ApoAuctionDedup.dedupe(v.records||[]);return{...v,records:d.rows,duplicateRecordCount:d.removedCount||0,note:(v.note||'')+(d.removedCount?` Wykryto ${d.removedCount} lustrzanych duplikatów tej samej sprzedaży; nie są liczone jako osobne notowania.`:'')}};
    ApoArchive.__dedupInstalled=true;
  }
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',install):install();
})();
