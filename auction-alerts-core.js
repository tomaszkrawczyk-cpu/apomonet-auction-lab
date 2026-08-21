(()=>{
  const n=s=>window.ApoNumis?.normalize?ApoNumis.normalize(s):String(s||'').toLowerCase().trim();
  function score(t,l){let s=0;if(t.ruler&&l.ruler&&n(t.ruler)===n(l.ruler))s+=25;if(t.year&&l.year&&String(t.year)===String(l.year))s+=30;if(t.nominal&&l.nominal&&n(t.nominal)===n(l.nominal))s+=25;if(t.mint&&l.mint&&n(t.mint)===n(l.mint))s+=10;if(t.variant&&l.variant&&n(t.variant)===n(l.variant))s+=10;if(!s&&t.title&&l.title&&n(l.title).includes(n(t.title)))s=35;return s}
  function match(targets,lots,min=60){const out=[];for(const t of targets||[])for(const l of lots||[]){const confidence=score(t,l);if(confidence>=min)out.push({target:t,coinId:t.coinId||t.id||null,targetSource:t.targetSource||'watchlist',lot:l,confidence})}return out.sort((a,b)=>b.confidence-a.confidence)}
  function targetAlbums(state){return (state.albums||[]).filter(a=>a?.id==='goals'||a?.id==='dreams'||a?.kind==='targets'||a?.kind==='dreams'||['moje cele','marzenia'].includes(n(a?.name)))}
  function targetsFromWatchlist(){
    const s=window.ApoMonet?.load?.()||{},watch=(s.watchlist||[]).filter(x=>x.type==='coin'||x.ruler||x.nominal),albums=targetAlbums(s),goalCoins=[];
    for(const album of albums){
      for(const coin of (s.coins||[]).filter(c=>(c.albumIds||[]).includes(album.id))){
        goalCoins.push({...coin,coinId:coin.id,targetSource:album.kind==='dreams'||album.id==='dreams'?'dreams-album':'goals-album',targetAlbumId:album.id,targetAlbumName:album.name});
      }
    }
    const seen=new Set(),all=[];
    for(const x of [...goalCoins,...watch]){
      const k=x.coinId?`coin:${x.coinId}`:[n(x.ruler),x.year,n(x.nominal),n(x.mint),n(x.variant),n(x.title)].join('|');
      if(seen.has(k))continue;seen.add(k);all.push(x);
    }
    return all;
  }
  window.ApoAuctionAlerts={score,match,targetsFromWatchlist,targetAlbums};
})();
