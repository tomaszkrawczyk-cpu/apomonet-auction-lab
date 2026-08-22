(()=>{
  if(!window.ApoMonet||ApoMonet.__canonicalSentinels)return;
  const normalize=s=>String(s??'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ł/g,'l');
  const unknownPatterns=[
    /^$/,/^nie\s+ustalono$/,/^nieokreslon[ay]?$/,/^brak$/,/^do\s+potwierdzenia$/,
    /^not\s+determined$/,/^undetermined$/,/^unknown$/,/^to\s+be\s+confirmed$/,
    /^nicht\s+bestimmt$/,/^unbekannt$/,/^zu\s+bestatigen$/,
    /^non\s+determinee?$/,/^inconnu(?:e)?$/,/^a\s+confirmer$/
  ];
  const isUnknown=v=>unknownPatterns.some(r=>r.test(normalize(v)));
  const canonical=v=>isUnknown(v)?'Nie ustalono':v;
  const TOP_FIELDS=['country','ruler','year','nominal','mint','metal','variant'];
  const DETAIL_FIELDS=['variant','mintmaster','visibleDateReading'];
  function normalizeDetail(detail){
    if(!detail||typeof detail!=='object')return detail;
    const out={...detail};
    for(const k of DETAIL_FIELDS)if(k in out)out[k]=canonical(out[k]);
    return out;
  }
  function normalizeCoin(coin){
    if(!coin||typeof coin!=='object')return coin;
    const out={...coin};
    for(const k of TOP_FIELDS)if(k in out)out[k]=canonical(out[k]);
    if(out.detail)out.detail=normalizeDetail(out.detail);
    return out;
  }
  const oldUpsert=ApoMonet.upsertCoin.bind(ApoMonet);
  ApoMonet.upsertCoin=coin=>oldUpsert(normalizeCoin(coin));
  ApoMonet.__canonicalSentinels=true;
  window.ApoCanonicalRecordSentinels={isUnknown,canonical,normalizeCoin};
  try{
    const state=ApoMonet.load();
    let changed=false;
    const coins=(state.coins||[]).map(c=>{
      const next=normalizeCoin(c);
      if(JSON.stringify(next)!==JSON.stringify(c))changed=true;
      return next;
    });
    if(changed){state.coins=coins;ApoMonet.save(state)}
  }catch(error){console.warn('[canonical-sentinels]',error)}
})();
