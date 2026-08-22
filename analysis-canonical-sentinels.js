(()=>{
  const normalize=s=>String(s??'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const unknownPatterns=[
    /^nie\s+ustalono$/,/^nieokreslona?$/,/^brak$/,/^do\s+potwierdzenia$/,
    /^not\s+determined$/,/^undetermined$/,/^unknown$/,/^to\s+be\s+confirmed$/,
    /^nicht\s+bestimmt$/,/^unbekannt$/,/^zu\s+bestatigen$/,
    /^non\s+determinee?$/,/^inconnu(?:e)?$/,/^a\s+confirmer$/
  ];
  const isUnknown=v=>{const n=normalize(v);return !n||unknownPatterns.some(r=>r.test(n))};
  const canonical=v=>isUnknown(v)?'Nie ustalono':v;
  function canonicalizeAnalysis(a){if(!a||typeof a!=='object')return a;for(const k of ['country','ruler','year','nominal','mint','metal','variant'])if(k in a)a[k]=canonical(a[k]);return a}
  const nativeFetch=window.fetch.bind(window);
  window.fetch=async function(input,init){
    const url=typeof input==='string'?input:(input?.url||'');
    const response=await nativeFetch(input,init);
    if(!response.ok||(!url.includes('/api/analyze')&&!url.includes('/api/analyze-detail')))return response;
    try{
      const data=await response.clone().json();
      if(data.analysis)canonicalizeAnalysis(data.analysis);
      if(data.detail)canonicalizeAnalysis(data.detail);
      const headers=new Headers(response.headers);headers.set('content-type','application/json; charset=utf-8');
      return new Response(JSON.stringify(data),{status:response.status,statusText:response.statusText,headers});
    }catch{return response}
  };
  window.ApoCanonicalSentinels={isUnknown,canonical,canonicalizeAnalysis};
})();