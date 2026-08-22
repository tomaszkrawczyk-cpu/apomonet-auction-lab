(()=>{
  if(!window.ApoMonet||window.ApoAlbumDomainIntegrity)return;
  const clean=v=>String(v??'').trim();
  const exists=(state,id)=>Boolean(clean(id)&&(state?.albums||[]).some(a=>String(a.id)===clean(id)));
  const wrap=(name,guard)=>{const original=ApoMonet[name];if(typeof original!=='function')return;ApoMonet[name]=function(...args){return guard(original.bind(ApoMonet),...args)}};
  wrap('assignCoinToAlbum',(next,coinId,albumId)=>{const state=ApoMonet.load(),target=clean(albumId);if(!target||!exists(state,target)||!state.coins?.some(c=>String(c.id)===String(coinId)))return null;return next(coinId,target)});
  wrap('removeCoinFromAlbum',(next,coinId,albumId)=>{const state=ApoMonet.load(),source=clean(albumId);if(!source||!state.coins?.some(c=>String(c.id)===String(coinId)))return null;return next(coinId,source)});
  wrap('moveCoinBetweenAlbums',(next,coinId,fromAlbumId,toAlbumId)=>{const state=ApoMonet.load(),from=clean(fromAlbumId),to=clean(toAlbumId);if(!state.coins?.some(c=>String(c.id)===String(coinId)))return null;if(!to||!exists(state,to))return null;if(from&&from===to)return ApoMonet.getCoin?.(coinId)||null;return next(coinId,from,to)});
  window.ApoAlbumDomainIntegrity=Object.freeze({exists});
})();