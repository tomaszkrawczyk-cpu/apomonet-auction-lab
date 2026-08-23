(()=>{
  if(!location.pathname.endsWith('export.html'))return;
  const language=()=>window.ApoLanguageRegistry?.current?.()||window.ApoI18n?.current?.()||localStorage.getItem('apomonet_language_v2')||'pl';
  const locale=()=>({pl:'pl-PL',en:'en-GB',de:'de-DE',fr:'fr-FR'}[language()]||'en-GB');
  const currencyOf=c=>String(c?.marketCurrency||c?.valuationCurrency||'PLN').trim().toUpperCase()||'PLN';
  const number=v=>{const n=Number(v);return Number.isFinite(n)&&n>0?n:null};
  const money=(v,c)=>{const n=number(v);if(n==null)return'';try{return new Intl.NumberFormat(locale(),{style:'currency',currency:c,maximumFractionDigits:0}).format(n)}catch{return Math.round(n)+' '+c}};
  const range=c=>c?.priceRange?String(c.priceRange):'';
  function refresh(){const ids=JSON.parse(sessionStorage.getItem('apomonet_export_ids')||'[]'),coins=(window.ApoMonet?.load?.().coins||[]).filter(c=>ids.includes(c.id));document.querySelectorAll('#list .export-card').forEach((card,index)=>{const coin=coins[index];if(!coin)return;const cells=card.querySelectorAll('.market-grid > div');if(cells[0]){const span=cells[0].querySelector('span');cells[0].textContent='';if(span)cells[0].append(span);cells[0].append(document.createTextNode(money(coin.marketMedian,currencyOf(coin))||coin.valuationNote||'—'))}if(cells[1]){const span=cells[1].querySelector('span');cells[1].textContent='';if(span)cells[1].append(span);cells[1].append(document.createTextNode(range(coin)||'—'))}})}
  const rerender=()=>setTimeout(refresh,0);document.readyState==='loading'?addEventListener('DOMContentLoaded',rerender):rerender();['languagechange','apo-language-changed','apomonet:language-change'].forEach(event=>addEventListener(event,rerender));window.ApoExportMarketCurrency=Object.freeze({language,locale,currencyOf,money,range,refresh});
})();
