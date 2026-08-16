(()=>{
  if(!location.pathname.endsWith('coin.html'))return;
  const parse=(raw)=>{try{return JSON.parse(raw||'null')}catch{return null}};
  const id=new URLSearchParams(location.search).get('id');
  if(!id||!window.ApoMonet)return;

  // Recover the photos of the exact coin from the active analysis session if an
  // earlier navigation reached the card before the image fields were persisted.
  const coin=ApoMonet.getCoin(id);
  const session=parse(sessionStorage.getItem('apomonetAnalysisSession'));
  if(coin&&session?.id===id&&Array.isArray(session.imgs)){
    const patch={id};
    let changed=false;
    if(!coin.obverseImage&&session.imgs[0]){patch.obverseImage=session.imgs[0];changed=true;}
    if(!coin.reverseImage&&session.imgs[1]){patch.reverseImage=session.imgs[1];changed=true;}
    if(changed){
      try{ApoMonet.upsertCoin(patch)}catch(error){console.warn('[coin-photo-recovery]',error)}
    }
  }

  addEventListener('DOMContentLoaded',()=>{
    const content=document.getElementById('coinContent');
    if(!content)return;
    const current=ApoMonet.getCoin(id);
    if(!current)return;

    const style=document.createElement('style');
    style.textContent=`
      .apo-saved-banner{margin:0 0 18px;padding:15px 16px;border:1px solid #315c27;border-radius:16px;background:#10180d;color:#d9f6cf}
      .apo-saved-banner strong{display:block;color:#83df63;font-size:17px;margin-bottom:4px}
      .coin-content .grid.two{grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
      .coin-content .photo-card{padding:12px}
      .coin-content .photo-card h2{font-size:17px;margin:0 0 10px}
      .coin-content .photo-card img{aspect-ratio:1;max-height:none;object-fit:contain;background:radial-gradient(circle at 50% 45%,#29292b,#0b0b0c 72%)}
      .coin-content .empty{min-height:220px;display:grid;place-items:center;border:1px dashed #3b3b40;border-radius:14px;color:#8f8f95;text-align:center}
      .coin-content .facts{grid-template-columns:1fr}
      .coin-content .fact{display:flex;justify-content:space-between;gap:18px;align-items:center;padding:13px 15px}
      .coin-content .fact span{margin:0}
      .coin-content .toolbar{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}
      @media(max-width:560px){.coin-content .grid.two{grid-template-columns:repeat(2,minmax(0,1fr))}.coin-content .toolbar{grid-template-columns:1fr}.coin-content .empty{min-height:155px}.coin-content .fact{align-items:flex-start}.coin-content .fact strong{text-align:right}}
    `;
    document.head.appendChild(style);

    if(!document.querySelector('.apo-saved-banner')){
      const banner=document.createElement('section');
      banner.className='apo-saved-banner';
      banner.innerHTML='<strong>✓ Zapisano do kolekcji</strong><span>Zdjęcia i zaakceptowane dane tej monety są zapisane razem.</span>';
      content.prepend(banner);
    }
  });
})();
