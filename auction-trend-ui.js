(()=>{
  if(!location.pathname.endsWith('analyze.html'))return;
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function coin(){try{return JSON.parse(sessionStorage.getItem('apomonetAnalysisSession')||'null')?.a||null}catch{return null}}
  function render(){
    const anchor=document.getElementById('auctionMarketFacts');if(!anchor||!window.ApoArchive?.valuation||!window.ApoAuctionTrend?.analyze)return;
    let box=document.getElementById('auctionTrendBox');if(!box){box=document.createElement('div');box.id='auctionTrendBox';box.className='detail';anchor.after(box)}
    const c=coin();if(!c){box.innerHTML='';return}
    const v=ApoArchive.valuation(c,10,'PLN'),rows=v?.valuationRecords||[];const t=ApoAuctionTrend.analyze(rows,v?.priceBasis||'');
    if(t.direction==='insufficient'){box.innerHTML='<b>Trend cen</b><p class="muted">Za mało porównywalnych sprzedaży w obu okresach, aby pokazać wiarygodny trend.</p>';return}
    const sign=t.changePct>0?'+':'';
    box.innerHTML=`<b>Trend cen</b><div class="data-grid" style="margin-top:10px"><div><span>Ostatnie ${t.recentYears} lata</span><strong>${esc(String(t.recentMedian))} PLN</strong></div><div><span>Starszy okres</span><strong>${esc(String(t.olderMedian))} PLN</strong></div><div><span>Kierunek</span><strong>${esc(t.label)}</strong></div><div><span>Zmiana mediany</span><strong>${esc(sign+String(t.changePct))}%</strong></div></div><p class="muted">Trend jest informacyjny i nie zastępuje wyceny. Porównuje medianę świeższych i starszych mocnych notowań tej samej monety/odmiany.</p>`;
  }
  const init=()=>{setTimeout(render,220);const facts=document.getElementById('facts'),deep=document.getElementById('deepText');if(facts)new MutationObserver(()=>setTimeout(render,50)).observe(facts,{childList:true,subtree:true,characterData:true});if(deep)new MutationObserver(()=>setTimeout(render,50)).observe(deep,{childList:true,subtree:true,characterData:true})};
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init):init();
})();
