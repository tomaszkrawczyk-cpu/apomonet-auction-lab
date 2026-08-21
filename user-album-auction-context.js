(()=>{
  if(!location.pathname.endsWith('user-album.html'))return;
  const esc=s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
  function mount(){
    if(!window.ApoMonet||!window.ApoAuctionContext)return;
    const list=document.getElementById('list');if(!list)return;
    const bind=()=>{
      list.querySelectorAll('.coin-card').forEach(card=>{
        if(card.querySelector('[data-apo-auction-context]'))return;
        const edit=card.querySelector('a[href^="coin-edit.html?id="]');
        if(!edit)return;
        const id=new URL(edit.href,location.href).searchParams.get('id');
        const coin=id?ApoMonet.getCoin(id):null;if(!coin)return;
        const actions=card.querySelector('.actions');if(!actions)return;
        const a=document.createElement('a');a.className='btn secondary';a.dataset.apoAuctionContext='1';
        a.href=ApoAuctionContext.archiveUrl(coin);a.textContent='🔎 Sprawdź aukcje';
        actions.insertBefore(a,actions.firstChild);
      });
    };
    bind();
    new MutationObserver(bind).observe(list,{childList:true,subtree:true});
  }
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',mount):mount();
})();
