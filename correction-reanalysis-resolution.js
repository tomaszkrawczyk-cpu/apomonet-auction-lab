(()=>{
  const comparable=value=>String(value??'').trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pl-PL');
  const identityKey=coin=>['nominal','ruler','year','mint','metal'].map(key=>comparable(coin?.[key])).join('|');
  function resolved(coin){
    if(!coin?.userAccepted||!coin?.correctionReanalysisIdentityKey)return false;
    return coin.correctionReanalysisIdentityKey===identityKey(coin)&&Boolean(coin.marketReanalysisCompletedAt);
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
  window.ApoCorrectionReanalysisResolution=Object.freeze({identityKey,resolved,repair,repairState});
  function init(){installWriteGuard();repairState()}
  document.readyState==='loading'?addEventListener('DOMContentLoaded',init):init();
})();
