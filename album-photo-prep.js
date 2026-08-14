(()=>{
  const PENDING='apomonetAlbumPhotoPrep';
  const esc=s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
  const circleCut=data=>new Promise(resolve=>{
    if(!data)return resolve(null);
    const im=new Image();
    im.onerror=()=>resolve(data);
    im.onload=()=>{
      const size=Math.max(320,Math.min(720,Math.max(im.naturalWidth||im.width,im.naturalHeight||im.height))),c=document.createElement('canvas');
      c.width=c.height=size;const x=c.getContext('2d');x.clearRect(0,0,size,size);
      const scale=Math.min(size/(im.naturalWidth||im.width),size/(im.naturalHeight||im.height));
      const w=(im.naturalWidth||im.width)*scale,h=(im.naturalHeight||im.height)*scale,dx=(size-w)/2,dy=(size-h)/2;
      x.save();x.beginPath();x.arc(size/2,size/2,size*.485,0,Math.PI*2);x.clip();x.drawImage(im,dx,dy,w,h);x.restore();
      resolve(c.toDataURL('image/png'));
    };im.src=data;
  });
  function modal(){
    const bg=document.createElement('div');bg.id='albumPhotoPrep';bg.style.cssText='position:fixed;inset:0;background:#000c;z-index:12000;display:grid;place-items:center;padding:18px';
    const box=document.createElement('div');box.style.cssText='width:min(520px,100%);background:#111113;border:1px solid #4a361b;border-radius:22px;padding:20px';
    box.innerHTML='<span class="eyebrow">Zdjęcie do albumu</span><h2 style="margin:8px 0 6px">Chcesz, żebym wyciął tło?</h2><p style="color:#aaa;line-height:1.5">Oryginalne zdjęcia pozostaną bez zmian. Wycięta wersja będzie używana tylko jako zdjęcie prezentacyjne w albumie.</p>';
    const make=(txt,cls)=>{const b=document.createElement('button');b.className='btn '+cls+' full';b.style.marginTop='9px';b.textContent=txt;box.appendChild(b);return b};
    const cut=make('✂️ Tak — usuń tło','primary'),keep=make('🖼️ Nie — zostaw oryginalne zdjęcie','secondary'),none=make('⏭️ Zapisz bez zdjęcia w albumie','secondary'),cancel=make('Anuluj','secondary');
    bg.appendChild(box);document.body.appendChild(bg);return{bg,cut,keep,none,cancel};
  }
  function setPending(v){try{sessionStorage.setItem(PENDING,JSON.stringify(v))}catch{}}
  function getPending(){try{return JSON.parse(sessionStorage.getItem(PENDING)||'null')}catch{return null}}
  function clearPending(){sessionStorage.removeItem(PENDING)}
  function patchAssign(){if(!window.ApoMonet||ApoMonet.__albumPhotoPatched)return;const old=ApoMonet.assignCoinToAlbum;ApoMonet.assignCoinToAlbum=function(coinId,albumId){const p=getPending(),coin=ApoMonet.getCoin(coinId);if(p&&coin){const patch={id:coinId,albumPhotoMode:p.mode};if(p.mode==='cut'){patch.albumObverseImage=p.obverse||null;patch.albumReverseImage=p.reverse||null}else if(p.mode==='original'){patch.albumObverseImage=null;patch.albumReverseImage=null}else if(p.mode==='none'){patch.albumObverseImage=null;patch.albumReverseImage=null}ApoMonet.upsertCoin(patch);clearPending()}return old.call(ApoMonet,coinId,albumId)};ApoMonet.__albumPhotoPatched=true}
  function hookAnalyze(){if(!location.pathname.endsWith('analyze.html'))return;const b=document.getElementById('album');if(!b||b.dataset.photoPrepHook==='1')return;b.dataset.photoPrepHook='1';const original=b.onclick;b.onclick=async e=>{e?.preventDefault?.();const m=modal(),finish=()=>{m.bg.remove();if(typeof original==='function')original.call(b,e)};m.cancel.onclick=()=>m.bg.remove();m.keep.onclick=()=>{setPending({mode:'original'});finish()};m.none.onclick=()=>{setPending({mode:'none'});finish()};m.cut.onclick=async()=>{m.cut.disabled=true;m.cut.textContent='Wycinam tło…';const oi=document.getElementById('oi')?.src||'',ri=document.getElementById('ri')?.src||'';const [obverse,reverse]=await Promise.all([circleCut(oi),circleCut(ri)]);setPending({mode:'cut',obverse,reverse});finish()}}
  }
  function hookAlbum(){if(!location.pathname.endsWith('user-album.html'))return;const list=document.getElementById('list');if(!list)return;const fix=()=>{document.querySelectorAll('.coin-card').forEach(card=>{if(card.querySelector('.photo-mode-actions'))return;const id=card.querySelector('.coin-pick')?.dataset.id;if(!id)return;const c=ApoMonet.getCoin(id),actions=card.querySelector('.actions');if(!c||!actions)return;const wrap=document.createElement('div');wrap.className='photo-mode-actions';wrap.style.cssText='display:flex;gap:6px;flex-wrap:wrap;width:100%;margin-top:4px';const mk=(t,fn)=>{const b=document.createElement('button');b.className='btn secondary';b.textContent=t;b.onclick=fn;wrap.appendChild(b)};mk('✂️ Usuń tło',async()=>{const [o,r]=await Promise.all([circleCut(c.obverseImage),circleCut(c.reverseImage)]);ApoMonet.upsertCoin({id:c.id,albumPhotoMode:'cut',albumObverseImage:o,albumReverseImage:r});location.reload()});mk('🖼️ Oryginał',()=>{ApoMonet.upsertCoin({id:c.id,albumPhotoMode:'original',albumObverseImage:null,albumReverseImage:null});location.reload()});actions.appendChild(wrap)})};setTimeout(fix,50);new MutationObserver(()=>setTimeout(fix,0)).observe(list,{childList:true,subtree:true})}
  addEventListener('DOMContentLoaded',()=>{patchAssign();setTimeout(hookAnalyze,30);setTimeout(hookAlbum,30)});
})();
