(()=>{
  if(!location.pathname.endsWith('analyze.html'))return;
  const PENDING='apomonetAlbumPhotoPrep';
  const safeParse=(raw)=>{try{return JSON.parse(raw||'null')}catch{return null}};
  const validImage=(src)=>typeof src==='string'&&(src.startsWith('data:image/')||src.startsWith('blob:')||src.startsWith('http'));
  const previewSource=(id)=>{const src=document.getElementById(id)?.src||'';return validImage(src)?src:''};

  function syncPendingCoinId(coinId){
    const pending=safeParse(sessionStorage.getItem(PENDING));
    if(!pending)return;
    try{sessionStorage.setItem(PENDING,JSON.stringify({...pending,coinId}))}catch{}
  }

  function hardenAlbumAssignment(){
    if(!window.ApoMonet||ApoMonet.__albumIdentityFix)return;
    const previous=ApoMonet.assignCoinToAlbum;
    ApoMonet.assignCoinToAlbum=function(coinId,albumId){
      // Najważniejsze: tryb przygotowania zdjęcia zawsze przypisujemy do monety,
      // która WŁAŚNIE jest dodawana do albumu, nigdy do starej sesji analizy.
      syncPendingCoinId(coinId);

      const coin=ApoMonet.getCoin(coinId);
      const obverse=previewSource('oi')||coin?.obverseImage||'';
      const reverse=previewSource('ri')||coin?.reverseImage||'';
      if(coin&&(obverse||reverse)){
        ApoMonet.upsertCoin({id:coinId,obverseImage:obverse||null,reverseImage:reverse||null});
      }
      const result=previous.call(ApoMonet,coinId,albumId);

      // Po zapisie weryfikujemy, że dokładnie ten rekord ma zdjęcia.
      const saved=ApoMonet.getCoin(coinId);
      if(saved&&!saved.obverseImage&&obverse)ApoMonet.upsertCoin({id:coinId,obverseImage:obverse});
      if(saved&&!saved.reverseImage&&reverse)ApoMonet.upsertCoin({id:coinId,reverseImage:reverse});
      return ApoMonet.getCoin(coinId)||result;
    };
    ApoMonet.__albumIdentityFix=true;
  }

  function addRetakeControls(modal){
    if(!modal||modal.querySelector('[data-apo-retake-controls]'))return;
    const status=modal.querySelector('.photo-prep-status');
    if(!status)return;
    const controls=document.createElement('div');
    controls.dataset.apoRetakeControls='1';
    controls.style.cssText='display:none;margin-top:12px;padding-top:12px;border-top:1px solid #303034';
    const note=document.createElement('p');
    note.style.cssText='color:#ddd;line-height:1.45;margin:0 0 8px';
    note.textContent='Wynik analizy zostaje zachowany. Możesz poprawić tylko zdjęcie i ponowić usuwanie tła.';
    const make=(text,inputId)=>{
      const button=document.createElement('button');
      button.type='button';
      button.className='btn secondary full';
      button.style.marginTop='8px';
      button.textContent=text;
      button.onclick=()=>document.getElementById(inputId)?.click();
      controls.appendChild(button);
    };
    controls.appendChild(note);
    make('📷 Zrób nowe zdjęcie awersu','obverseInput');
    make('📷 Zrób nowe zdjęcie rewersu','reverseInput');
    modal.querySelector('div')?.appendChild(controls);

    const refresh=()=>{
      const text=(status.textContent||'').toLowerCase();
      controls.style.display=text.includes('nie udało')||text.includes('could not')||text.includes('nicht sicher')||text.includes("n’a pas")?'block':'none';
    };
    new MutationObserver(refresh).observe(status,{childList:true,subtree:true,characterData:true});
    refresh();
  }

  function observePhotoPrep(){
    const scan=()=>addRetakeControls(document.getElementById('albumPhotoPrep'));
    scan();
    new MutationObserver(scan).observe(document.body,{childList:true,subtree:true});
  }

  addEventListener('DOMContentLoaded',()=>{
    hardenAlbumAssignment();
    observePhotoPrep();
  });
})();
