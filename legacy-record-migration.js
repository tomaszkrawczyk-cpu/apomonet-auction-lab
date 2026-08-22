(()=>{
  if(!window.ApoMonet?.load||!window.ApoMonet?.save)return;
  const VERSION=1;
  const clean=v=>String(v??'').trim();
  const comparable=v=>clean(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pl-PL');
  const fields=['nominal','ruler','year','mint','metal','variant'];
  const changed=c=>Boolean(c?.userAccepted&&c?.rawAI)&&fields.some(k=>clean(c[k])&&comparable(c[k])!==comparable(c.rawAI?.[k]));
  const stale=c=>Boolean(c?.derivedDataStale||c?.needsReanalysis);
  const hasLegacyDerived=c=>Boolean(c?.detail||c?.kopickiReference||c?.kopickiRarity||c?.tyszkiewiczReference||c?.parchimowiczReference||c?.marketMedian||c?.estimatedPrice||c?.priceRange||c?.auctionMarketSnapshot);
  function migrate(c){
    if(!c||Number(c.recordMigrationVersion||0)>=VERSION)return c;
    let next={...c,recordMigrationVersion:VERSION,recordMigratedAt:new Date().toISOString()};
    if(changed(next)&&hasLegacyDerived(next)&&!stale(next)){
      next=window.ApoDerivedInvalidation?.invalidate?.(next)||next;
      next.recordMigrationVersion=VERSION;next.recordMigratedAt=new Date().toISOString();next.legacyDerivedDataQuarantined=true;
    }
    return next;
  }
  function run(){const state=ApoMonet.load();let dirty=false;state.coins=(state.coins||[]).map(c=>{const n=migrate(c);if(JSON.stringify(n)!==JSON.stringify(c))dirty=true;return n});if(dirty)ApoMonet.save(state);return dirty}
  window.ApoLegacyRecordMigration=Object.freeze({VERSION,changed,hasLegacyDerived,migrate,run});
  document.readyState==='loading'?addEventListener('DOMContentLoaded',run):run();
})();
