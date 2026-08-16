(()=>{
  const onAnalyze=()=>location.pathname.endsWith('analyze.html');
  const onCoin=()=>location.pathname.endsWith('coin.html');
  const safeText=v=>String(v??'').trim();

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

  function showDetailedAnalysisOnCard(){
    if(!onCoin()||!window.ApoMonet)return;
    const coinId=new URLSearchParams(location.search).get('id');
    const coin=coinId?ApoMonet.getCoin(coinId):null;
    const detail=coin?.detail;
    if(!coin||!detail||document.getElementById('savedDetailAnalysis'))return;
    const anchor=document.getElementById('descriptionCard')||document.getElementById('facts');
    if(!anchor)return;
    const card=document.createElement('section');
    card.id='savedDetailAnalysis';
    card.className='card';
    const title=document.createElement('h2');
    title.textContent='Analiza szczegółowa';
    card.appendChild(title);
    const rows=[
      ['Odmiana / typ',detail.variant||coin.variant],
      ['Katalog Kopickiego',[detail.kopickiReference,detail.kopickiRarity].filter(Boolean).join(' • ')],
      ['Interpunkcja legendy',detail.legendPunctuation],
      ['Awers — obserwacje',detail.obverseDetails],
      ['Rewers — obserwacje',detail.reverseDetails],
      ['Cechy diagnostyczne',Array.isArray(detail.diagnosticFeatures)?detail.diagnosticFeatures.join('; '):''],
      ['Uwagi',Array.isArray(detail.warnings)?detail.warnings.join(' '):''],
      ['Pewność analizy',detail.confidence!=null?`${detail.confidence}%`:''],
    ].filter(([,value])=>safeText(value));
    for(const [label,value] of rows){
      const block=document.createElement('div');
      block.className='detail';
      const b=document.createElement('b');b.textContent=label;
      const p=document.createElement('p');p.textContent=value;
      block.append(b,p);card.appendChild(block);
    }
    anchor.insertAdjacentElement('afterend',card);
  }

  addEventListener('DOMContentLoaded',()=>{
    protectNewRecordIdentity();
    captureAlbumAssignment();
    navigateAfterAlbumSave();
    setTimeout(showDetailedAnalysisOnCard,80);
  });
})();
