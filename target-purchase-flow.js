(()=>{
  const n=s=>String(s||'').toLowerCase().trim();
  function collectionAlbum(state){return (state.albums||[]).find(a=>a.id==='my-album'||a.kind==='collection'||n(a.name)==='mój album'||n(a.name)==='moj album')||null}
  function goalOrDreamAlbums(state,coin){const ids=new Set(coin?.albumIds||[]);return (state.albums||[]).filter(a=>ids.has(a.id)&&(a.id==='goals'||a.id==='dreams'||a.kind==='targets'||a.kind==='dreams'||['moje cele','marzenia'].includes(n(a.name))))}
  function completePurchase(coinId,lot={}){
    if(!window.ApoMonet||!coinId)return null;
    const state=ApoMonet.load(),coin=(state.coins||[]).find(c=>c.id===coinId);if(!coin)return null;
    const collection=collectionAlbum(state);if(!collection)return {ok:false,error:'Brak albumu „Mój album”.'};
    const sources=goalOrDreamAlbums(state,coin),fromIds=sources.map(a=>a.id);
    let current=coin;
    for(const fromId of fromIds)current=ApoMonet.moveCoinBetweenAlbums(coinId,fromId,collection.id)||current;
    if(!fromIds.length)current=ApoMonet.assignCoinToAlbum(coinId,collection.id)||current;
    const patch={id:coinId,purchaseStatus:'purchased',purchasedAt:new Date().toISOString(),purchaseSource:lot.sourceLabel||lot.source||coin.purchaseSource||'',purchaseUrl:lot.sourceUrl||lot.url||coin.purchaseUrl||'',purchasePrice:Number(lot.hammerPrice||lot.realizedPrice||lot.price)||coin.purchasePrice||'',purchaseCurrency:lot.currency||coin.purchaseCurrency||coin.currency||'PLN'};
    current=ApoMonet.upsertCoin(patch);
    return {ok:true,coin:current,collectionAlbumId:collection.id,removedFrom:fromIds};
  }
  window.ApoTargetPurchase={collectionAlbum,goalOrDreamAlbums,completePurchase};
})();
