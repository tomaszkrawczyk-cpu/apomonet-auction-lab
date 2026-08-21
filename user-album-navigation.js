(()=>{
  if(!location.pathname.endsWith('user-album.html'))return;
  function bind(){
    const list=document.getElementById('list');
    if(!list)return;
    list.querySelectorAll('.coin-card').forEach(card=>{
      const id=card.querySelector('.coin-pick')?.dataset.id;
      if(!id)return;
      const open=()=>{location.href='coin.html?id='+encodeURIComponent(id)};
      for(const el of [card.querySelector('.coin-photo'),card.querySelector('h2')]){
        if(!el||el.dataset.apoOpenBound)return;
        el.dataset.apoOpenBound='1';
        el.style.cursor='pointer';
        el.setAttribute('role','link');
        el.setAttribute('tabindex','0');
        el.addEventListener('click',open);
        el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open();}});
      }
    });
  }
  addEventListener('DOMContentLoaded',()=>{
    bind();
    const list=document.getElementById('list');
    if(list)new MutationObserver(bind).observe(list,{childList:true,subtree:true});
  });
})();
