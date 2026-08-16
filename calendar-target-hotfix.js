(()=>{
  if(!location.pathname.endsWith('calendar.html'))return;
  addEventListener('DOMContentLoaded',()=>{
    const q=new URLSearchParams(location.search),coin=(q.get('coin')||'').trim();
    if(!coin)return;
    const main=document.querySelector('main.shell');
    const timeline=document.getElementById('timeline');
    if(!main||!timeline)return;
    const panel=document.createElement('section');
    panel.className='card';
    panel.style.margin='0 0 18px';
    panel.innerHTML=`<span class="eyebrow">Szukasz tej monety</span><h2 style="margin:6px 0 10px"></h2><p class="muted">Wybierz dom aukcyjny lub platformę. ApoMonet otworzy oryginalne źródło w nowej karcie.</p><div class="toolbar" style="margin-top:12px"><a class="btn primary" href="https://onebid.pl/pl/auctions/Monety" target="_blank" rel="noopener">OneBid — monety</a><a class="btn secondary" href="auction-house.html?id=stary-sklep">Stary Sklep</a><a class="btn secondary" href="auction-house.html?id=niemczyk">Niemczyk</a><a class="btn secondary" href="auction-house.html?id=wcn">WCN</a><a class="btn secondary" href="auction-house.html?id=gndm">Marciniak</a></div>`;
    panel.querySelector('h2').textContent=coin;
    timeline.parentNode.insertBefore(panel,timeline);
  });
})();
