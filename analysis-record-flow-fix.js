(()=>{
  const onAnalyze=()=>location.pathname.endsWith('analyze.html');
  const L={pl:'Nowe zdjęcie — tworzę nowy rekord monety. Dodaj obie strony i uruchom analizę.',en:'New photo — creating a new coin record. Add both sides and start the analysis.',de:'Neues Foto — ein neuer Münzdatensatz wird erstellt. Beide Seiten hinzufügen und die Analyse starten.',fr:'Nouvelle photo — création d’une nouvelle fiche monnaie. Ajoutez les deux faces et lancez l’analyse.'};
  const lang=()=>window.ApoLanguageRegistry?.current?.()||window.ApoI18n?.current?.()||localStorage.getItem('apomonet_language_v2')||'pl';
  const freshMessage=()=>L[lang()]||L.en||L.pl;
  const readSession=()=>{try{return JSON.parse(sessionStorage.getItem('apomonetAnalysisSession')||'null')}catch{return null}};
  const clearLastAssignment=()=>{try{delete window.__apoLastAlbumCoinId;delete window.__apoLastAlbumAssignment}catch{}};

  function clearAnalysisForFreshPhotos(){
    if(!onAnalyze())return;
    if(document.getElementById('albumPhotoPrep'))return;
    try{ id=null; }catch{}
    try{ a=null; }catch{}
    try{ localizedA=null; }catch{}
    try{ window.__apoLocalizedAnalysis=null; }catch{}
    clearLastAssignment();
    for(const key of ['apomonetAnalysisSession','apomonetReturnToAnalysis','apomonetOpenAlbumAfterResume','apomonetAlbumPhotoPrep']){
      try{sessionStorage.removeItem(key)}catch{}
    }
    document.getElementById('panel')?.classList.add('hidden');
    document.getElementById('deepPanel')?.classList.add('hidden');
    document.getElementById('savedActions')?.classList.add('hidden');
    const status=document.getElementById('status');
    if(status)status.textContent=freshMessage();
  }

  function protectNewRecordIdentity(){
    if(!onAnalyze())return;
    ['obverseInput','reverseInput'].forEach(inputId=>{
      const input=document.getElementById(inputId);
      if(!input||input.dataset.apoFreshRecordGuard==='1')return;
      input.dataset.apoFreshRecordGuard='1';
      input.addEventListener('change',()=>{
        if(input.files?.length)clearAnalysisForFreshPhotos();
      },{capture:true});
    });
  }

  function captureAlbumAssignment(){
    if(!onAnalyze()||!window.ApoMonet||ApoMonet.__recordNavigationCapture)return;
    const previous=ApoMonet.assignCoinToAlbum;
    ApoMonet.assignCoinToAlbum=function(coinId,albumId){
      const result=previous.call(ApoMonet,coinId,albumId);
      const savedId=result?.id||coinId||'';
      if(savedId){
        window.__apoLastAlbumCoinId=savedId;
        window.__apoLastAlbumAssignment={coinId:savedId,albumId:String(albumId||''),at:Date.now()};
      }
      return result;
    };
    ApoMonet.__recordNavigationCapture=true;
  }

  function navigateAfterAlbumSave(){
    if(!onAnalyze())return;
    const goToSavedRecord=()=>{
      setTimeout(()=>{
        const assignment=window.__apoLastAlbumAssignment;
        if(!assignment?.coinId||Date.now()-Number(assignment.at||0)>3000)return;
        const session=readSession();
        if(session?.id&&String(session.id)!==String(assignment.coinId))return;
        const saved=(window.ApoMonet&&typeof ApoMonet.getCoin==='function')?ApoMonet.getCoin(assignment.coinId):null;
        if(!saved||String(saved.id)!==String(assignment.coinId))return;
        clearLastAssignment();
        location.href='coin.html?id='+encodeURIComponent(saved.id);
      },220);
    };
    document.addEventListener('pointerdown',event=>{
      const target=event.target?.closest?.('#albumList .album-option, #createAlbum');
      if(target)clearLastAssignment();
    },{capture:true});
    document.addEventListener('click',event=>{
      const target=event.target?.closest?.('#albumList .album-option, #createAlbum');
      if(target)goToSavedRecord();
    });
  }

  addEventListener('DOMContentLoaded',()=>{
    protectNewRecordIdentity();
    captureAlbumAssignment();
    navigateAfterAlbumSave();
  });
})();