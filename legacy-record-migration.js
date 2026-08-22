(()=>{
  if(!window.ApoMonet?.load||!window.ApoMonet?.save)return;
  const VERSION=3;
  const clean=v=>String(v??'').trim();
  const comparable=v=>clean(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pl-PL');
  const fields=['nominal','ruler','year','mint','metal','variant'];
  const identityKey=c=>fields.map(k=>comparable(c?.[k])).join('|');
  const legacyKey=c=>fields.slice(0,5).map(k=>comparable(c?.[k])).join('|');
  const changed=c=>Boolean(c?.userAccepted&&c?.rawAI)&&fields.some(k=>clean(c[k])&&comparable(c[k])!==comparable(c.rawAI?.[k]));
  const stale=c=>Boolean(c?.derivedDataStale||c?.needsReanalysis);
  const hasLegacyDerived=c=>Boolean(c?.detail||c?.kopickiReference||c?.kopickiRarity||c?.tyszkiewiczReference||c?.parchimowiczReference||c?.marketMedian||c?.estimatedPrice||c?.priceRange||c?.auctionMarketSnapshot);
  const reanalysisResolved=c=>{
    const current=identityKey(c),key=clean(c?.correctionReanalysisIdentityKey),legacy=legacyKey(c);
    const identityMatches=key===current||(key===legacy&&comparable(c?.variant)===comparable(c?.rawAI?.variant));
    return Boolean(identityMatches&&c?.marketReanalysisCompletedAt&&c?.detailReanalysisCompletedAt&&c?.detailReanalysisIdentityKey===current);
  };
  const forceInvalidate=c=>{
    const seed={...c};delete seed.derivedStateIdentityKey;
    let out=window.ApoDerivedInvalidation?.invalidate?.(seed)||seed;
    if(!stale(out)){out={...out,analysisLevel:'basic',needsReanalysis:true,needsDetailedAnalysis:true,derivedDataStale:true,derivedDataStaleReason:'Starsze dane pochodne odizolowano po korekcie identyfikacji; wymagają świeżej analizy Stage 2 i rynku.',valuationNote:'Wycena, literatura i notowania wymagają ponownego dopasowania do zaakceptowanej identyfikacji.'};}
    return out;
  };
  function migrate(c){
    if(!c||Number(c.recordMigrationVersion||0)>=VERSION)return c;
    let next={...c,recordMigrationVersion:VERSION,recordMigratedAt:new Date().toISOString()};
    if(changed(next)&&hasLegacyDerived(next)&&!stale(next)&&!reanalysisResolved(next)){
      next=forceInvalidate(next);
      next.recordMigrationVersion=VERSION;next.recordMigratedAt=new Date().toISOString();next.legacyDerivedDataQuarantined=true;
    }
    return next;
  }
  function run(){const state=ApoMonet.load();let dirty=false;state.coins=(state.coins||[]).map(c=>{const n=migrate(c);if(JSON.stringify(n)!==JSON.stringify(c))dirty=true;return n});if(dirty)ApoMonet.save(state);return dirty}
  window.ApoLegacyRecordMigration=Object.freeze({VERSION,identityKey,changed,hasLegacyDerived,reanalysisResolved,forceInvalidate,migrate,run});
  document.readyState==='loading'?addEventListener('DOMContentLoaded',run):run();
})();
