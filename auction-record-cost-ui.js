(()=>{
  if(!location.pathname.endsWith('analyze.html'))return;
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=(v,c)=>v?`${Math.round(Number(v)||0)} ${c||''}`.trim():'—';
  function coin(){try{return JSON.parse(sessionStorage.getItem('apomonetAnalysisSession')||'null')?.a||null}catch{return null}}
  function resultValue(r){const basis=window.ApoArchive?.priceBasis?.(r)||'';const value=basis==='hammer'?r.hammerPrice:basis==='realized'?r.realizedPrice:basis==='total'?r.totalPrice:r.price;return{basis,value:Number(value)||0}}
  function basisLabel(b){return b==='hammer'?'Cena młotkowa':b==='realized'?'Cena realizacji':b==='total'?'Cena całkowita':'Cena'}
  function evidence(r){const q=window.ApoAuctionSourceQuality?.assess?.(r);if(!q)return{level:'unknown',score:0,label:'Nie oceniono'};return{...q,label:q.level==='strong'?'Mocny dowód':q.level==='usable'?'Dobry dowód':q.level==='limited'?'Pomocniczy':'Słaby dowód'}}
  function buyerCost(r){const hammer=Number(r?.hammerPrice)||0;if(!hammer||!window.ApoAuctionCost?.calculateForHouse)return null;const house=r.auctionHouse||r.sourceLabel||r.source||'';const cost=ApoAuctionCost.calculateForHouse({hammer,auctionHouse:house,saleDate:r.soldAt,currency:r.currency});return cost?.complete?cost:null}
  function render(){
    const anchor=document.getElementById('auctionMarketFacts');if(!anchor||!window.ApoArchive?.comparable)return;
    let box=document.getElementById('auctionComparableCards');if(!box){box=document.createElement('div');box.id='auctionComparableCards';box.className='detail';anchor.after(box)}
    const c=coin(),rows=c?ApoArchive.comparable(c,10).slice(0,5):[];
    if(!rows.length){box.innerHTML='<b>Najlepsze porównania aukcyjne</b><p class="muted">Brak zweryfikowanych rekordów do pokazania.</p>';return}
    const cards=rows.map(r=>{const rv=resultValue(r),cost=buyerCost(r),ev=evidence(r),src=r.sourceLabel||r.source||'Źródło',date=r.soldAt?new Date(r.soldAt).toLocaleDateString('pl-PL'):'—';const detail=cost?`<div><span>Szacowany koszt zakupu</span><strong>${esc(money(cost.total,r.currency))}</strong></div><div><span>Prowizja kupującego</span><strong>${esc(money(cost.buyerPremium,r.currency))}</strong></div><div><span>VAT od prowizji</span><strong>${esc(money(cost.premiumVat,r.currency))}</strong></div>`:`<div><span>Szacowany koszt zakupu</span><strong>—</strong><small>Brak ceny młotkowej lub zweryfikowanej reguły opłat.</small></div>`;return `<article class="apo-auction-compare" style="margin-top:12px;padding:12px;border:1px solid #2b2b30;border-radius:14px;background:#121214"><div style="display:flex;justify-content:space-between;gap:12px"><strong>${esc(src)}</strong><span>${esc(date)}</span></div><p class="muted" style="margin:6px 0 0">Jakość źródła: <strong>${esc(ev.label)}</strong> (${esc(String(ev.score))}/100)${ev.level==='limited'||ev.level==='weak'?' — rekord informacyjny, bez wpływu na wycenę.':''}</p><div class="data-grid" style="margin-top:10px"><div><span>${esc(basisLabel(rv.basis))}</span><strong>${esc(money(rv.value,r.currency))}</strong></div>${detail}</div>${r.sourceUrl?`<p style="margin:10px 0 0"><a href="${esc(r.sourceUrl)}" target="_blank" rel="noopener">Otwórz źródło →</a></p>`:''}</article>`}).join('');
    box.innerHTML='<b>Najlepsze porównania aukcyjne</b><p class="muted">Wynik aukcji i koszt kupującego są pokazywane osobno. Jakość źródła określa, czy rekord może wpływać na widełki wyceny.</p>'+cards;
  }
  const init=()=>{setTimeout(render,180);const facts=document.getElementById('facts'),deep=document.getElementById('deepText');if(facts)new MutationObserver(()=>setTimeout(render,40)).observe(facts,{childList:true,subtree:true,characterData:true});if(deep)new MutationObserver(()=>setTimeout(render,40)).observe(deep,{childList:true,subtree:true,characterData:true})};
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init):init();
})();
