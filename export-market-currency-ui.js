(()=>{
  if(!location.pathname.endsWith('export.html'))return;
  const currencyOf=c=>String(c?.marketCurrency||c?.valuationCurrency||'PLN').trim().toUpperCase()||'PLN';
  const number=v=>{const n=Number(v);return Number.isFinite(n)&&n>0?n:null};
  const money=(v,c)=>{const n=number(v);if(n==null)return'';try{return new Intl.NumberFormat('pl-PL',{maximumFractionDigits:0}).format(n)+' '+c}catch{return Math.round(n)+' '+c}};
  const range=(c)=>{const currency=currencyOf(c),low=number(c?.estimateLow),high=number(c?.estimateHigh);if(c?.priceRange)return String(c.priceRange).includes(currency)?String(c.priceRange):`${c.priceRange} ${currency}`;if(low!=null&&high!=null)return`${money(low,currency)}–${money(high,currency)}`;if(low!=null)return`od ${money(low,currency)}`;if(high!=null)return`do ${money(high,currency)}`;return''};
  function refresh(){
    const ids=JSON.parse(sessionStorage.getItem('apomonet_export_ids')||'[]');
    const coins=(window.ApoMonet?.load?.().coins||[]).filter(c=>ids.includes(c.id));
    document.querySelectorAll('#list .export-card').forEach((card,index)=>{
      const coin=coins[index];if(!coin)return;
      const cells=card.querySelectorAll('.market-grid > div');
      if(cells[0]){const span=cells[0].querySelector('span'),value=coin.estimatedPrice??coin.marketMedian;cells[0].textContent='';if(span)cells[0].append(span);const text=money(value,currencyOf(coin))||coin.valuationNote||'—';cells[0].append(document.createTextNode(text));}
      if(cells[1]){const span=cells[1].querySelector('span');cells[1].textContent='';if(span)cells[1].append(span);cells[1].append(document.createTextNode(range(coin)||'—'));}
    });
  }
  document.readyState==='loading'?addEventListener('DOMContentLoaded',()=>setTimeout(refresh,0)):setTimeout(refresh,0);
  window.ApoExportMarketCurrency=Object.freeze({currencyOf,money,range,refresh});
})();
