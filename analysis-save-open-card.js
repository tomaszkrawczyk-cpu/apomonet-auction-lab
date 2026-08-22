(()=>{
  if(!location.pathname.endsWith('analyze.html'))return;
  const validImage=src=>typeof src==='string'&&(src.startsWith('data:image/')||src.startsWith('blob:')||src.startsWith('http'));
  const preview=id=>{const src=document.getElementById(id)?.src||'';return validImage(src)?src:''};
  addEventListener('DOMContentLoaded',()=>{
    const save=document.getElementById('save');
    if(!save||save.dataset.apoOpenCard==='1')return;
    save.dataset.apoOpenCard='1';
    save.addEventListener('click',()=>{
      setTimeout(()=>{
        const link=document.getElementById('savedCoinLink');
        const href=link?.getAttribute('href')||'';
        const match=href.match(/^coin\.html\?id=(.+)$/);
        if(!match)return;
        const coinId=decodeURIComponent(match[1]);
        const obverse=preview('oi'),reverse=preview('ri');
        try{
          const saved=window.ApoMonet?.getCoin?.(coinId);
          if(saved){
            const patch={id:coinId};let changed=false;
            if(!saved.obverseImage&&obverse){patch.obverseImage=obverse;changed=true;}
            if(!saved.reverseImage&&reverse){patch.reverseImage=reverse;changed=true;}
            if(changed)window.ApoMonet.upsertCoin(patch);
            const verified=window.ApoMonet.getCoin(coinId);
            if((obverse&&!verified?.obverseImage)||(reverse&&!verified?.reverseImage)){
              const status=document.getElementById('status');
              if(status)status.textContent='Moneta została zapisana, ale nie udało się potwierdzić zapisu obu zdjęć. Nie otwieram jeszcze karty, żeby nie pokazać pustych pól.';
              return;
            }
          }
        }catch(error){
          console.error('[saved-card-photo-verification]',error);
          const status=document.getElementById('status');if(status)status.textContent=error?.message||'Nie udało się potwierdzić zapisu zdjęć.';return;
        }
        location.href=href;
      },100);
    });
  });
})();
