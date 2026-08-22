(()=>{
  if(!location.pathname.endsWith('user-album.html'))return;
  const L={pl:'Otwórz kartę',en:'Open coin card',de:'Münzkarte öffnen',fr:'Ouvrir la fiche'};
  const lang=()=>window.ApoLanguageRegistry?.current?.()||window.ApoI18n?.current?.()||localStorage.getItem('apomonet_language_v2')||'pl';
  const label=()=>L[lang()]||L.en;
  function coinId(card){return card.querySelector('.coin-pick')?.dataset?.id||card.querySelector('.remove')?.dataset?.id||card.querySelector('.move')?.dataset?.id||''}
  function update(card){
    const id=coinId(card),actions=card.querySelector('.actions');if(!id||!actions)return;
    let open=actions.querySelector('.apo-open-coin-card');
    if(!open){open=document.createElement('a');open.className='btn primary apo-open-coin-card';actions.prepend(open)}
    open.href='coin.html?id='+encodeURIComponent(id);open.textContent=label();
  }
  function refresh(){document.querySelectorAll('#list .coin-card').forEach(update)}
  function init(){refresh();const root=document.getElementById('list');if(root)new MutationObserver(refresh).observe(root,{childList:true});['languagechange','apo-language-changed','apomonet:language-change'].forEach(e=>addEventListener(e,refresh));}
  document.readyState==='loading'?addEventListener('DOMContentLoaded',init):init();
})();