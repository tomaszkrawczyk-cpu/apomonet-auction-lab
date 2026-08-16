(()=>{
  if(!location.pathname.endsWith('album.html'))return;
  const bind=()=>{
    const list=document.getElementById('coinList');
    if(!list)return;
    list.querySelectorAll('.coin-card').forEach(card=>{
      const id=card.querySelector('.coin-pick')?.dataset.id;
      if(!id)return;
      const title=(card.querySelector('h2')?.textContent||'').trim();
      const photo=card.querySelector('.coin-photo');
      const heading=card.querySelector('h2');
      [photo,heading].forEach(el=>{
        if(!el||el.dataset.apoOpenBound)return;
        el.dataset.apoOpenBound='1';
        el.style.cursor='pointer';
        el.setAttribute('role','link');
        el.setAttribute('tabindex','0');
        const open=()=>location.href='demo-coin.html?id='+encodeURIComponent(id);
        el.addEventListener('click',open);
        el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open();}});
      });
      const auction=[...card.querySelectorAll('a.btn')].find(a=>(a.textContent||'').toLowerCase().includes('aukc'));
      if(auction){
        auction.href='calendar.html?coin='+encodeURIComponent(title)+'&coinId='+encodeURIComponent(id);
        auction.removeAttribute('target');
      }
    });
  };
  addEventListener('DOMContentLoaded',()=>{
    bind();
    const list=document.getElementById('coinList');
    if(list)new MutationObserver(bind).observe(list,{childList:true,subtree:true});
  });
})();
