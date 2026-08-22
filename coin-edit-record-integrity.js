(()=>{
  const onEdit=()=>location.pathname.endsWith('coin-edit.html');
  const editable=['title','nominal','ruler','year','mint','metal','variant','grade','rarity','description','notes','provenance','catalog','purchasePrice','currency'];
  const L={
    pl:{missing:'Nie znaleziono tej monety. Zapis został zatrzymany, aby nie utworzyć błędnego rekordu.'},
    en:{missing:'This coin could not be found. Saving was stopped to avoid creating an incorrect record.'},
    de:{missing:'Diese Münze wurde nicht gefunden. Das Speichern wurde gestoppt, damit kein fehlerhafter Datensatz entsteht.'},
    fr:{missing:'Cette monnaie est introuvable. L’enregistrement a été interrompu afin d’éviter la création d’une fiche incorrecte.'}
  };
  const lang=()=>window.ApoLanguageRegistry?.current?.()||window.ApoI18n?.current?.()||localStorage.getItem('apomonet_language_v2')||'pl';
  const text=k=>L[lang()]?.[k]||L.en[k]||L.pl[k];
  const currentId=()=>new URLSearchParams(location.search).get('id');
  const persistent=src=>typeof src==='string'&&(src.startsWith('data:image/')||src.startsWith('http://')||src.startsWith('https://'));

  function latestCoin(){
    const id=currentId();
    return id?ApoMonet.getCoin(id):null;
  }

  function writeFreshAnalysisSession(){
    const fresh=latestCoin();
    if(!fresh)return false;
    let old={};
    try{old=JSON.parse(sessionStorage.getItem('apomonetAnalysisSession')||'{}')||{}}catch{}
    const oldImgs=Array.isArray(old.imgs)?[...old.imgs]:[null,null];
    const imgs=[persistent(fresh.obverseImage)?fresh.obverseImage:oldImgs[0]||null,persistent(fresh.reverseImage)?fresh.reverseImage:oldImgs[1]||null];
    const oldAnalysis=Array.isArray(old.analysisImgs)?[...old.analysisImgs]:[null,null];
    const analysisImgs=[oldAnalysis[0]||imgs[0],oldAnalysis[1]||imgs[1]];
    const diagnostics=Array.isArray(old.photoDiagnostics)?[...old.photoDiagnostics]:[null,null];
    const corrected={
      ...(old.a||{}),
      ...fresh,
      description:fresh.description||old.a?.description||'',
      fullDescription:fresh.fullDescription||fresh.description||old.a?.fullDescription||old.a?.description||'',
      userAccepted:true,
      correctedAt:new Date().toISOString()
    };
    try{
      sessionStorage.setItem('apomonetAnalysisSession',JSON.stringify({...old,id:fresh.id,a:corrected,imgs,analysisImgs,photoDiagnostics:diagnostics,at:Date.now(),version:Math.max(Number(old.version)||0,5)}));
      sessionStorage.setItem('apomonetReturnToAnalysis','1');
      return true;
    }catch{return false}
  }

  function mount(){
    if(!onEdit()||typeof window.saveCorrection!=='function'||!window.ApoMonet)return;
    const original=window.saveCorrection;
    if(original.__apoRecordIntegrity)return;

    function guardedSaveCorrection(){
      const queryId=currentId();
      if(queryId&&!ApoMonet.getCoin(queryId)){
        const out=document.getElementById('saved');
        if(out)out.textContent=text('missing');
        return null;
      }

      let saved=original();
      if(!saved?.id)return saved;

      const patch={id:saved.id};
      for(const key of editable){
        const el=document.getElementById(key);
        if(el)patch[key]=String(el.value??'').trim();
      }
      saved=ApoMonet.upsertCoin(patch)||ApoMonet.getCoin(saved.id)||saved;
      writeFreshAnalysisSession();
      return saved;
    }
    guardedSaveCorrection.__apoRecordIntegrity=true;
    window.saveCorrection=guardedSaveCorrection;

    if(typeof window.refreshAnalysisSession==='function'){
      const legacyRefresh=window.refreshAnalysisSession;
      window.refreshAnalysisSession=function(){
        if(writeFreshAnalysisSession())return;
        return legacyRefresh();
      };
    }

    const form=document.getElementById('form');
    if(form&&!form.dataset.apoMissingRecordGuard){
      form.dataset.apoMissingRecordGuard='1';
      form.addEventListener('submit',event=>{
        const queryId=currentId();
        if(queryId&&!ApoMonet.getCoin(queryId)){
          event.preventDefault();event.stopImmediatePropagation();
          const out=document.getElementById('saved');if(out)out.textContent=text('missing');
        }
      },true);
    }
  }

  window.ApoCoinEditRecordIntegrity=Object.freeze({writeFreshAnalysisSession});
  document.readyState==='loading'?addEventListener('DOMContentLoaded',mount):setTimeout(mount,0);
})();