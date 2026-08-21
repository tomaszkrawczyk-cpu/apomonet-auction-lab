(()=>{
  if(!location.pathname.endsWith('archive.html'))return;
  const money=(n,c='PLN')=>{try{return new Intl.NumberFormat('pl-PL',{style:'currency',currency:c,maximumFractionDigits:0}).format(Number(n)||0)}catch{return `${n||0} ${c}`}};
  function sourceLabel(match){return match.targetSource==='dreams-album'?'Marzenia':match.targetSource==='goals-album'?'Moje cele':'Obserwowane'}
  function targetLabel(match){return match.target?.title||[match.target?.ruler,match.target?.nominal,match.target?.year,match.target?.mint,match.target?.variant].filter(Boolean).join(' ')||'Cel kolekcjonerski'}
  function lotLabel(lot){return lot?.title||[lot?.ruler,lot?.nominal,lot?.year,lot?.mint,lot?.variant].filter(Boolean).join(' ')||'Pozycja aukcyjna'}
  function ensurePanel(){
    let panel=document.getElementById('apoArchiveAlerts');if(panel)return panel;
    const results=document.getElementById('results');if(!results)return null;
    panel=document.createElement('section');panel.id='apoArchiveAlerts';panel.className='card';panel.style.margin='16px 0';
    results.parentNode.insertBefore(panel,results);return panel;
  }
  function render(){
    const panel=ensurePanel();if(!panel||!window.ApoArchive||!window.ApoAuctionAlerts)return;
    const targets=ApoAuctionAlerts.targetsFromWatchlist();
    const lots=ApoArchive.search('',{years:10})||[];
    const matches=ApoAuctionAlerts.match(targets,lots,60).slice(0,30);
    if(!targets.length){panel.innerHTML='<div class="section-title"><h2>Trafienia dla Celów i Marzeń</h2></div><div class="empty">Dodaj monetę do „Moje cele” lub „Marzenia”, aby APOMONET porównywał ją z zapisanymi faktami aukcyjnymi.</div>';return;}
    if(!matches.length){panel.innerHTML='<div class="section-title"><h2>Trafienia dla Celów i Marzeń</h2></div><div class="empty">Brak wiarygodnych dopasowań w zapisanym archiwum. APOMONET nie pokazuje luźnych trafień jako alertów.</div>';return;}
    const rows=matches.map(m=>{
      const strong=m.quality==='strong';const why=(m.reasons||[]).join(' • ');
      const price=m.lot?.hammerPrice||m.lot?.realizedPrice||m.lot?.price;
      const coinUrl=m.coinId?`coin.html?id=${encodeURIComponent(m.coinId)}`:'';
      return `<div class="archive-row"><div><span class="todo">${strong?'MOCNE DOPASOWANIE':'MOŻLIWE DOPASOWANIE'}</span><br><span class="muted">${sourceLabel(m)} • ${m.confidence}%</span></div><div><strong>${targetLabel(m)}</strong><br><span>${lotLabel(m.lot)}</span>${why?`<br><span class="muted">Dlaczego: ${why}</span>`:''}</div><div>${price?`<strong>${money(price,m.lot?.currency||'PLN')}</strong><br>`:''}${coinUrl?`<a href="${coinUrl}">Otwórz cel →</a><br>`:''}${m.lot?.sourceUrl?`<a href="${m.lot.sourceUrl}" target="_blank" rel="noopener">Źródło →</a>`:''}</div></div>`;
    }).join('');
    panel.innerHTML=`<div class="section-title"><h2>Trafienia dla Celów i Marzeń</h2><span class="todo">${matches.length}</span></div><p class="source-note">Alerty powstają wyłącznie z zapisanych faktów aukcyjnych. „Mocne” wymaga zgodności pól krytycznych dla konkretnego celu.</p>${rows}`;
  }
  addEventListener('DOMContentLoaded',()=>{
    render();
    const refresh=()=>setTimeout(render,80);
    document.getElementById('searchBtn')?.addEventListener('click',refresh);
    document.getElementById('importBtn')?.addEventListener('click',()=>setTimeout(render,800));
    document.getElementById('addBtn')?.addEventListener('click',refresh);
  });
})();
