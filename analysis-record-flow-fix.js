(()=>{
  const onAnalyze=()=>location.pathname.endsWith('analyze.html');

  function clearAnalysisForFreshPhotos(){
    if(!onAnalyze())return;
    // Retake inside the background-removal dialog belongs to the SAME coin and must
    // preserve the accepted analysis. Every other new photo selection starts a new record.
    if(document.getElementById('albumPhotoPrep'))return;
    try{ id=null; }catch{}
    try{ a=null; }catch{}
    try{ localizedA=null; }catch{}
    try{ window.__apoLocalizedAnalysis=null; }catch{}
    for(const key of ['apomonetAnalysisSession','apomonetReturnToAnalysis','apomonetOpenAlbumAfterResume','apomonetAlbumPhotoPrep']){
      try{sessionStorage.removeItem(key)}catch{}
    }
    document.getElementById('panel')?.classList.add('hidden');
    document.getElementById('deepPanel')?.classList.add('hidden');
    document.getElementById('savedActions')?.classList.add('hidden');
    const status=document.getElementById('status');
    if(status)status.textContent='Nowe zdjęcie — tworzę nowy rekord monety. Dodaj obie strony i uruchom analizę.';
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
      if(result?.id)window.__apoLastAlbumCoinId=result.id;
      else if(coinId)window.__apoLastAlbumCoinId=coinId;
      return result;
    };
    ApoMonet.__recordNavigationCapture=true;
  }

  function navigateAfterAlbumSave(){
    if(!onAnalyze())return;
    const goToSavedRecord=()=>{
      setTimeout(()=>{
        const coinId=window.__apoLastAlbumCoinId;
        if(!coinId)return;
        const saved=window.ApoMonet?.getCoin?.(coinId);
        if(!saved)return;
        location.href='coin.html?id='+encodeURIComponent(saved.id);
      },220);
    };
    document.addEventListener('click',event=>{
      const target=event.target?.closest?.('#albumList .album-option, #createAlbum');
      if(target)goToSavedRecord();
    });
  }

  // Rendering the saved Stage 2 card lives in coin-card-finish.js.
  // Keeping only one renderer prevents duplicated "Analiza szczegółowa" sections.
  addEventListener('DOMContentLoaded',()=>{
    protectNewRecordIdentity();
    captureAlbumAssignment();
    navigateAfterAlbumSave();
  });
})();
