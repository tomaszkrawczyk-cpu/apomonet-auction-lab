(()=>{
  function install(){
    if(!window.ApoArchive?.valuationRows||!window.ApoAuctionOutliers?.filter||ApoArchive.__outlierPolicyInstalled)return;
    const base=ApoArchive.valuationRows;
    ApoArchive.valuationRows=function(rows,coin){
      const chosen=base(rows,coin);if(!chosen?.rows?.length||!chosen.priceBasis)return chosen;
      const filtered=ApoAuctionOutliers.filter(chosen.rows,chosen.priceBasis);
      return{...chosen,rows:filtered.rows,outliers:filtered.outliers||[],outlierMethod:filtered.method||'none',outlierReason:filtered.reason||'',preOutlierCount:chosen.rows.length};
    };
    ApoArchive.__outlierPolicyInstalled=true;
  }
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',install):install();
})();
