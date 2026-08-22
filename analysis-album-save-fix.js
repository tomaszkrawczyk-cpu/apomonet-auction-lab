(()=>{
  if(!location.pathname.endsWith('analyze.html'))return;
  const PENDING='apomonetAlbumPhotoPrep';
  const SESSION='apomonetAnalysisSession';
  const safeParse=(raw)=>{try{return JSON.parse(raw||'null')}catch{return null}};
  const persistentImage=(src)=>typeof src==='string'&&(src.startsWith('data:image/')||src.startsWith('http://')||src.startsWith('https://'));
  const previewSource=(id)=>{const src=document.getElementById(id)?.src||'';return persistentImage(src)?src:''};
  const lang=()=>window.ApoLanguageRegistry?.current?.()||window.ApoI18n?.current?.()||localStorage.getItem('apomonet_language_v2')||'pl';
  const COPY={
    pl:{note:'Wynik analizy zostaje zachowany. Możesz poprawić tylko zdjęcie i ponowić usuwanie tła.',obverse:'📷 Zrób nowe zdjęcie awersu',reverse:'📷 Zrób nowe zdjęcie rewersu'},
    en:{note:'The analysis result will be preserved. You can replace only the photo and retry background removal.',obverse:'📷 Take a new obverse photo',reverse:'📷 Take a new reverse photo'},
    de:{note:'Das Analyseergebnis bleibt erhalten. Sie können nur das Foto ersetzen und die Hintergrundentfernung erneut versuchen.',obverse:'📷 Neues Foto der Vorderseite',reverse:'📷 Neues Foto der Rückseite'},
    fr:{note:'Le résultat de l’analyse est conservé. Vous pouvez remplacer uniquement la photo et relancer la suppression de l’arrière-plan.',obverse:'📷 Reprendre la photo de l’avers',reverse:'📷 Reprendre la photo du revers'}
  };
  const c=()=>COPY[lang()]||COPY.en||COPY.pl;

  function syncPendingCoinId(coinId){
    const pending=safeParse(sessionStorage.getItem(PENDING));
    if(!pending)return;
    try{sessionStorage.setItem(PENDING,JSON.stringify({...pending,coinId}))}catch{}
  }

  function hardenAlbumAssignment(){
    if(!window.ApoMonet||ApoMonet.__albumIdentityFix)return;
    const previous=ApoMonet.assignCoinToAlbum;
    ApoMonet.assignCoinToAlbum=function(coinId,albumId){
      syncPendingCoinId(coinId);
      const coin=ApoMonet.getCoin(coinId);
      const obverse=previewSource('oi')||(persistentImage(coin?.obverseImage)?coin.obverseImage:'');
      const reverse=previewSource('ri')||(persistentImage(coin?.reverseImage)?coin.reverseImage:'');
      if(coin&&(obverse||reverse))ApoMonet.upsertCoin({id:coinId,obverseImage:obverse||null,reverseImage:reverse||null});
      const result=previous.call(ApoMonet,coinId,albumId);
      const saved=ApoMonet.getCoin(coinId);
      if(saved&&!saved.obverseImage&&obverse)ApoMonet.upsertCoin({id:coinId,obverseImage:obverse});
      if(saved&&!saved.reverseImage&&reverse)ApoMonet.upsertCoin({id:coinId,reverseImage:reverse});
      return ApoMonet.getCoin(coinId)||result;
    };
    ApoMonet.__albumIdentityFix=true;
  }

  function syncRetakeSession(){
    const sides=[['obverseInput','oi',0,'obverseImage'],['reverseInput','ri',1,'reverseImage']];
    for(const [inputId,previewId,index,field] of sides){
      const input=document.getElementById(inputId);if(!input||input.dataset.apoRetakeSessionSync==='1')continue;
      input.dataset.apoRetakeSessionSync='1';
      input.addEventListener('change',()=>{
        if(!document.getElementById('albumPhotoPrep')||!input.files?.length)return;
        const before=previewSource(previewId),started=Date.now();
        const timer=setInterval(()=>{
          const src=previewSource(previewId);
          if(Date.now()-started>8000){clearInterval(timer);return}
          if(!src||src===before)return;
          clearInterval(timer);
          const session=safeParse(sessionStorage.getItem(SESSION));
          if(!session?.id)return;
          const imgs=Array.isArray(session.imgs)?[...session.imgs]:[null,null];imgs[index]=src;
          const diagnostics=Array.isArray(session.photoDiagnostics)?[...session.photoDiagnostics]:[null,null];diagnostics[index]=null;
          const next={...session,imgs,photoDiagnostics:diagnostics,at:Date.now(),retakenSide:index===0?'obverse':'reverse',retakenAt:new Date().toISOString()};
          delete next.analysisImgs;
          try{sessionStorage.setItem(SESSION,JSON.stringify(next))}catch(error){console.warn('[retake-session-sync]',error)}
          const coin=window.ApoMonet?.getCoin?.(session.id);
          if(coin)try{ApoMonet.upsertCoin({id:session.id,[field]:src})}catch(error){console.warn('[retake-record-sync]',error)}
        },80);
      },{capture:true});
    }
  }

  function addRetakeControls(modal){
    if(!modal||modal.querySelector('[data-apo-retake-controls]'))return;
    const status=modal.querySelector('.photo-prep-status');
    if(!status)return;
    const controls=document.createElement('div');
    controls.dataset.apoRetakeControls='1';
    controls.style.cssText='display:none;margin-top:12px;padding-top:12px;border-top:1px solid #303034';
    const note=document.createElement('p');
    note.dataset.apoRetakeNote='1';
    note.style.cssText='color:#ddd;line-height:1.45;margin:0 0 8px';
    const make=(key,inputId)=>{
      const button=document.createElement('button');
      button.type='button';
      button.className='btn secondary full';
      button.dataset.apoRetakeKey=key;
      button.style.marginTop='8px';
      button.onclick=()=>document.getElementById(inputId)?.click();
      controls.appendChild(button);
    };
    controls.appendChild(note);
    make('obverse','obverseInput');
    make('reverse','reverseInput');
    modal.querySelector('div')?.appendChild(controls);
    const translate=()=>{const copy=c();note.textContent=copy.note;controls.querySelectorAll('[data-apo-retake-key]').forEach(b=>b.textContent=copy[b.dataset.apoRetakeKey])};
    translate();
    const refresh=()=>{
      const failed=modal.dataset.apoPhotoPrepFailed==='1'||status.dataset.state==='error'||status.getAttribute('aria-invalid')==='true'||/nie udało|could not|failed|nicht|erreur|échec|n[’']a pas/i.test(status.textContent||'');
      controls.style.display=failed?'block':'none';
    };
    new MutationObserver(refresh).observe(status,{childList:true,subtree:true,characterData:true,attributes:true});
    ['languagechange','apo-language-changed','apomonet:language-change'].forEach(e=>addEventListener(e,translate));
    refresh();
  }

  function observePhotoPrep(){
    const scan=()=>addRetakeControls(document.getElementById('albumPhotoPrep'));
    scan();
    new MutationObserver(scan).observe(document.body,{childList:true,subtree:true});
  }

  addEventListener('DOMContentLoaded',()=>{
    hardenAlbumAssignment();
    syncRetakeSession();
    observePhotoPrep();
  });
})();