(()=>{
  const norm=s=>String(s||'').toUpperCase().replace(/[^A-Z0-9+\- ]/g,' ').replace(/\s+/g,' ').trim();
  const ORDER={F:1,VF:2,XF:3,AU:4};
  function band(value){
    const s=norm(value);
    if(!s)return'';
    if(/\bAU\b|ABOUT UNC|ALMOST UNC|PRAWIE MENNICZ|NIEMAL MENNICZ/.test(s))return'AU';
    if(/\bXF\b|\bEF\b|EXTREMELY FINE|BARDZO DOBRZE ZACHOWAN/.test(s))return'XF';
    if(/\bVF\b|VERY FINE|DOBRZE ZACHOWAN/.test(s))return'VF';
    if(/\bF\b|FINE|SŁAB|SLAB|WYRAŹNIE ZUŻYT|WYRAZNIE ZUZYT/.test(s))return'F';
    return'';
  }
  function fromCoin(coin){return band(coin?.grade||coin?.detail?.gradeAssessment||coin?.gradeAssessment)}
  function distance(a,b){const aa=ORDER[band(a)]||0,bb=ORDER[band(b)]||0;return aa&&bb?Math.abs(aa-bb):null}
  window.ApoGradeBand=Object.freeze({band,fromCoin,distance,order:ORDER});
})();
