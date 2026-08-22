(()=>{
  const comparable=value=>String(value??'').trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pl-PL');
  const identityKey=coin=>['nominal','ruler','year','mint','metal','variant'].map(key=>comparable(coin?.[key])).join('|');
  const legacyIdentityKey=coin=>['nominal','ruler','year','mint','metal'].map(key=>comparable(coin?.[key])).join('|');
  function resolved(coin){
    if(!coin?.userAccepted||!coin?.correctionReanalysisIdentityKey)return false;
    const key=coin.correctionReanalysisIdentityKey,current=identityKey(coin),legacy=legacyIdentityKey(coin);
    const identityMatches=key===current||(key===legacy&&comparable(coin.variant)===comparable(coin.rawAI?.variant));
    const detailMatches=Boolean(coin.detailReanalysisCompletedAt&&coin.detailReanalysisIdentityKey===current);
    const marketMatches=Boolean(coin.marketReanalysisCompletedAt&&coin.auctionMarketIdentityKey===current);
    return identityMatches&&detailMatches&&marketMatches;
  }
  function repair(coin){
    if(!resolved(coin))return coin;
    const next={...coin,needsReanalysis:false,derivedDataStale:false};
    if(next.derivedDataStaleReason)delete next.derivedDataStaleReason;
    return next;
  }
  function repairState(){
    if(!window.ApoMonet?.load||!window.ApoMonet?.save)return;
    const state=ApoMonet.load();let changed=false;
    state.coins=(state.coins||[]).map(coin=>{const next=repair(coin);if(JSON.stringify(next)!==JSON.stringify(coin))changed=true;return next});
    if(changed)ApoMonet.save(state);
  }
  function installWriteGuard(){
    if(!window.ApoMonet?.upsertCoin||ApoMonet.__correctionReanalysisResolutionGuard)return;
    const original=ApoMonet.upsertCoin;
    ApoMonet.upsertCoin=function(coin){return original.call(ApoMonet,repair(coin))};
    ApoMonet.__correctionReanalysisResolutionGuard=true;
  }
  window.ApoCorrectionReanalysisResolution=Object.freeze({identityKey,legacyIdentityKey,resolved,repair,repairState});
  function init(){installWriteGuard();repairState()}
  document.readyState==='loading'?addEventListener('DOMContentLoaded',init):init();
})();