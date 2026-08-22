(()=>{
  if(!window.ApoMonet||ApoMonet.__recordDeletionIntegrity)return;
  const original=ApoMonet.deleteCoin.bind(ApoMonet);
  const parse=(store,key,fallback)=>{try{const x=JSON.parse(store.getItem(key)||'null');return x??fallback}catch{return fallback}};
  const writeArray=(store,key,rows)=>{try{store.setItem(key,JSON.stringify(rows))}catch{}};
  function cleanupSession(id){
    const session=parse(sessionStorage,'apomonetAnalysisSession',null);
    if(session?.id===id){
      for(const key of ['apomonetAnalysisSession','apomonetReturnToAnalysis','apomonetOpenAlbumAfterResume','apomonetAlbumPhotoPrep','apomonetOwnerAnswers'])sessionStorage.removeItem(key);
    }
    const exportIds=parse(sessionStorage,'apomonet_export_ids',[]);
    if(Array.isArray(exportIds)&&exportIds.includes(id))writeArray(sessionStorage,'apomonet_export_ids',exportIds.filter(x=>x!==id));
    const demo=parse(sessionStorage,'apomonet_demo_export_coins',[]);
    if(Array.isArray(demo)&&demo.some(x=>x?.id===id))writeArray(sessionStorage,'apomonet_demo_export_coins',demo.filter(x=>x?.id!==id));
  }
  function cleanupLinkedWatchlist(id){
    const state=ApoMonet.load();
    const before=Array.isArray(state.watchlist)?state.watchlist:[];
    const sid=String(id);
    const after=before.filter(x=>{
      const linked=String(x?.coinId||'')===sid;
      const legacyCoinTarget=!x?.coinId&&String(x?.id||'')===sid&&(x?.type==='coin'||x?.ruler||x?.nominal);
      return !(linked||legacyCoinTarget);
    });
    if(after.length!==before.length){state.watchlist=after;ApoMonet.save(state)}
  }
  ApoMonet.deleteCoin=function(id){
    const coin=ApoMonet.getCoin(id);if(!coin)return false;
    original(id);
    if(ApoMonet.getCoin(id))return false;
    cleanupSession(id);
    try{cleanupLinkedWatchlist(id)}catch(error){console.warn('[record-delete-watchlist-cleanup]',error)}
    return true;
  };
  ApoMonet.__recordDeletionIntegrity=true;
  window.ApoRecordDeletionIntegrity=Object.freeze({cleanupSession,cleanupLinkedWatchlist});
  if(location.pathname.endsWith('coin.html')&&!document.querySelector('script[data-apo-coin-delete-i18n]')){const s=document.createElement('script');s.src='coin-delete-i18n.js';s.dataset.apoCoinDeleteI18n='1';document.head.appendChild(s)}
})();
