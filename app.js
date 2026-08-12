const ApoMonet = (() => {
  const KEY = 'apomonet_state_v2';
  const defaults = { coins: [], albums: [], watchlist: [], events: [], settings: { currency: 'PLN' }, history: [] };
  function load(){ try { return { ...defaults, ...(JSON.parse(localStorage.getItem(KEY)||'{}')) }; } catch { return structuredClone(defaults); } }
  function save(state){ localStorage.setItem(KEY, JSON.stringify(state)); }
  function uid(prefix='id'){ return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2,8)}`; }
  function pushHistory(state, entry){ state.history = state.history || []; state.history.unshift({ id: uid('h'), at: new Date().toISOString(), ...entry }); state.history = state.history.slice(0,200); }
  function seed(){ const s=load(); if(!s.albums.length) s.albums=[{id:'polska-krolewska',name:'Polska królewska',description:'Monety władców Polski'},{id:'srebro',name:'Srebro',description:'Monety srebrne'},{id:'do-opracowania',name:'Do opracowania',description:'Monety wymagające identyfikacji'}]; if(!s.events.length) s.events=[{id:'demo-auction',date:'DO UZUPEŁNIENIA',title:'Przykładowa aukcja',house:'Dom aukcyjny – DO UZUPEŁNIENIA'}]; save(s); return s; }
  function upsertCoin(coin){ const state=load(); const item={ id: coin.id || uid('coin'), createdAt: coin.createdAt || new Date().toISOString(), updatedAt:new Date().toISOString(), ...coin }; const i=state.coins.findIndex(x=>x.id===item.id); if(i>=0) state.coins[i]=item; else state.coins.unshift(item); pushHistory(state,{type:i>=0?'coin_updated':'coin_created',coinId:item.id,title:item.title||'Moneta'}); save(state); return item; }
  function getCoin(id){ return load().coins.find(x=>x.id===id) || null; }
  function deleteCoin(id){ const state=load(); const coin=state.coins.find(x=>x.id===id); state.coins=state.coins.filter(x=>x.id!==id); pushHistory(state,{type:'coin_deleted',coinId:id,title:coin?.title||'Moneta'}); save(state); }
  function addToWatchlist(item){ const state=load(); state.watchlist = state.watchlist || []; if(!state.watchlist.some(x=>x.id===item.id)) state.watchlist.unshift(item); save(state); }
  return { load, save, seed, uid, upsertCoin, getCoin, deleteCoin, addToWatchlist };
})();
window.ApoMonet=ApoMonet; ApoMonet.seed();
if ('serviceWorker' in navigator) window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{}));