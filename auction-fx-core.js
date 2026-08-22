(()=>{
  const num=v=>Number(String(v??'').replace(',','.'))||0;
  function hasFx(r,target='PLN'){
    const from=String(r?.currency||'').toUpperCase(),to=String(target||'').toUpperCase();
    if(!from||!to)return false;
    if(from===to)return true;
    return num(r?.fxRate)>0&&String(r?.fxTo||'').toUpperCase()===to&&!!r?.fxDate&&!!String(r?.fxSource||'').trim();
  }
  function convertValue(r,value,target='PLN'){
    const from=String(r?.currency||'').toUpperCase(),to=String(target||'').toUpperCase(),v=num(value);
    if(!v)return 0;if(from===to)return v;if(!hasFx(r,to))return 0;return v*num(r.fxRate);
  }
  function enrich(r,target='PLN'){
    const ok=hasFx(r,target);return{...r,fxTarget:String(target).toUpperCase(),fxConversionReady:ok,fxConversionLabel:ok?(String(r.currency||'').toUpperCase()===String(target).toUpperCase()?'Waluta zgodna':`Kurs ${r.fxRate} ${r.fxTo} z ${r.fxDate} (${r.fxSource})`):'Brak jawnego kursu z datą i źródłem'};
  }
  window.ApoAuctionFx={hasFx,convertValue,enrich};
})();