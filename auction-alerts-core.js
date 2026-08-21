(()=>{
  const n=s=>window.ApoNumis?.normalize?ApoNumis.normalize(s):String(s||'').toLowerCase().trim();
  const same=(a,b)=>n(a)&&n(b)&&n(a)===n(b);
  const conflict=(a,b)=>n(a)&&n(b)&&n(a)!==n(b);

  function scoreDetail(t,l){
    let s=0;
    const reasons=[];
    if(t.ruler&&l.ruler){if(same(t.ruler,l.ruler)){s+=25;reasons.push('ruler')}else{s-=35;reasons.push('ruler-conflict')}}
    if(t.year&&l.year){if(String(t.year)===String(l.year)){s+=30;reasons.push('year')}else{s-=45;reasons.push('year-conflict')}}
    if(t.nominal&&l.nominal){if(same(t.nominal,l.nominal)){s+=25;reasons.push('nominal')}else{s-=40;reasons.push('nominal-conflict')}}
    if(t.mint&&l.mint){if(same(t.mint,l.mint)){s+=10;reasons.push('mint')}else{s-=25;reasons.push('mint-conflict')}}
    if(t.variant&&l.variant){if(same(t.variant,l.variant)){s+=10;reasons.push('variant')}else{s-=30;reasons.push('variant-conflict')}}
    if(!s&&t.title&&l.title&&n(l.title).includes(n(t.title))){s=35;reasons.push('title-fallback')}

    const strict=Boolean(n(t.mint)||n(t.variant));
    const variantRequired=Boolean(n(t.variant));
    const mintRequired=Boolean(n(t.mint));
    const variantOk=!variantRequired||same(t.variant,l.variant);
    const mintOk=!mintRequired||!n(l.mint)||same(t.mint,l.mint);
    const coreOk=(!n(t.ruler)||!n(l.ruler)||same(t.ruler,l.ruler))&&(!t.year||!l.year||String(t.year)===String(l.year))&&(!n(t.nominal)||!n(l.nominal)||same(t.nominal,l.nominal));
    const strong=coreOk&&variantOk&&mintOk&&s>=70;
    return {score:Math.max(0,s),strict,strong,reasons,variantOk,mintOk,coreOk};
  }

  function score(t,l){return scoreDetail(t,l).score}
  function match(targets,lots,min=60){
    const out=[];
    for(const t of targets||[])for(const l of lots||[]){
      const detail=scoreDetail(t,l);
      const threshold=detail.strict?70:min;
      if(detail.score>=threshold&&detail.coreOk&&detail.variantOk&&detail.mintOk){
        out.push({target:t,coinId:t.coinId||t.id||null,targetSource:t.targetSource||'watchlist',lot:l,confidence:detail.score,matchStrength:detail.strong?'strong':'possible',matchReasons:detail.reasons});
      }
    }
    return out.sort((a,b)=>b.confidence-a.confidence);
  }

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
  window.ApoAuctionAlerts={score,scoreDetail,match,targetsFromWatchlist,targetAlbums};
})();
