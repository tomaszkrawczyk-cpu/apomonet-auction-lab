(()=>{
  if(!location.pathname.endsWith('user-album.html'))return;
  const LABEL={pl:'🔎 Sprawdź aukcje',en:'🔎 Check auctions',de:'🔎 Auktionen prüfen',fr:'🔎 Vérifier les enchères'};
  const lang=()=>window.ApoLanguageRegistry?.current?.()||window.ApoI18n?.current?.()||localStorage.getItem('apomonet_language_v2')||'pl';
  const text=()=>LABEL[lang()]||LABEL.en||LABEL.pl;
  function mount(){
    if(!window.ApoMonet||!window.ApoAuctionContext)return;
    const list=document.getElementById('list');if(!list)return;
    const bind=()=>{
      list.querySelectorAll('.coin-card').forEach(card=>{
        let action=card.querySelector('[data-apo-auction-context]');
        const edit=card.querySelector('a[href^="coin-edit.html?id="]');
        if(!edit)return;
        const id=new URL(edit.href,location.href).searchParams.get('id');
        const coin=id?ApoMonet.getCoin(id):null;if(!coin)return;
        const actions=card.querySelector('.actions');if(!actions)return;
        if(!action){action=document.createElement('a');action.className='btn secondary';action.dataset.apoAuctionContext='1';actions.insertBefore(action,actions.firstChild)}
        action.href=ApoAuctionContext.archiveUrl(coin);action.textContent=text();
      });
    };
    bind();new MutationObserver(bind).observe(list,{childList:true,subtree:true});
    ['languagechange','apo-language-changed','apomonet:language-change'].forEach(e=>addEventListener(e,bind));
  }
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',mount):mount();
})();
