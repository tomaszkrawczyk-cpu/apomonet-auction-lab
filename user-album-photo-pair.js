(()=>{
 if(!location.pathname.endsWith('user-album.html'))return;
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const L={pl:{obv:'Awers',rev:'Rewers',missing:'Brak zdjęcia'},en:{obv:'Obverse',rev:'Reverse',missing:'No image'},de:{obv:'Vorderseite',rev:'Rückseite',missing:'Kein Bild'},fr:{obv:'Avers',rev:'Revers',missing:'Pas d’image'}};
 const lang=()=>window.ApoLanguageRegistry?.current?.()||window.ApoI18n?.current?.()||localStorage.getItem('apomonet_language_v2')||'pl',t=k=>L[lang()]?.[k]||L.en[k]||L.pl[k]||k;
 function coinMap(){try{return new Map((window.ApoMonet?.load?.().coins||[]).map(c=>[String(c.id),c]))}catch{return new Map()}}
 function source(c,side){
   if(window.ApoAlbumPhotos?.resolve)return ApoAlbumPhotos.resolve(c,side)||'';
   if(c?.albumPhotoMode==='none')return'';
   const sideMode=side==='obverse'?(c?.albumObversePhotoMode||(c?.albumPhotoMode==='cut'?'cut':'original')):(c?.albumReversePhotoMode||(c?.albumPhotoMode==='cut'?'cut':'original'));
   if(sideMode==='cut'&&Number(c?.albumPhotoPrepVersion||0)>=2)return side==='obverse'?(c.albumObverseImage||c.obverseImage||''):(c.albumReverseImage||c.reverseImage||'');
   return side==='obverse'?(c?.obverseImage||''):(c?.reverseImage||'');
 }
 function draw(){
   const map=coinMap();
   document.querySelectorAll('#list .coin-card').forEach(card=>{
     const id=card.querySelector('.coin-pick')?.dataset.id;if(!id)return;const c=map.get(String(id));if(!c)return;
     const old=card.querySelector('.coin-photo'),existing=card.querySelector('.apo-photo-pair');if(!old&&!existing)return;
     let pair=existing;if(!pair){pair=document.createElement('div');pair.className='apo-photo-pair';pair.style.cssText='display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px';old.replaceWith(pair)}
     const obv=source(c,'obverse'),rev=source(c,'reverse'),signature=[lang(),obv,rev].join('|');
     if(pair.dataset.apoSignature!==signature){
       const cell=(src,label)=>`<div style="min-width:0"><div style="height:150px;display:flex;align-items:center;justify-content:center;background:radial-gradient(circle at 50% 45%,#272729,#111 72%);border-radius:14px;overflow:hidden">${src?`<img src="${esc(src)}" alt="${esc(label)}" loading="lazy" style="max-width:96%;max-height:142px;object-fit:contain;filter:drop-shadow(0 5px 8px #000)">`:`<span style="color:#777;font-size:12px">${esc(t('missing'))}</span>`}</div><small style="display:block;text-align:center;color:#888;margin-top:4px">${esc(label)}</small></div>`;
       pair.dataset.apoSignature=signature;pair.innerHTML=cell(obv,t('obv'))+cell(rev,t('rev'));
     }
     pair.onclick=()=>location.href='coin.html?id='+encodeURIComponent(c.id);pair.style.cursor='pointer';pair.setAttribute('role','link');pair.setAttribute('tabindex','0');
     pair.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();location.href='coin.html?id='+encodeURIComponent(c.id)}};
   })
 }
 function init(){draw();const list=document.getElementById('list');if(list)new MutationObserver(draw).observe(list,{childList:true,subtree:true});['languagechange','apo-language-changed','apomonet:language-change'].forEach(e=>addEventListener(e,draw))}
 document.readyState==='loading'?addEventListener('DOMContentLoaded',init):init();
 window.ApoUserAlbumPhotoPair=Object.freeze({source,draw});
})();
