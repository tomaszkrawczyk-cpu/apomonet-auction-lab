const ApoMonet = (() => {
  const KEY='apomonet_state_v2';
  const defaults={coins:[],albums:[],watchlist:[],events:[],settings:{currency:'PLN'},history:[]};
  function load(){try{return{...defaults,...(JSON.parse(localStorage.getItem(KEY)||'{}'))}}catch{return structuredClone(defaults)}}
  function save(s){localStorage.setItem(KEY,JSON.stringify(s))}
  function uid(p='id'){return `${p}_${Date.now()}_${Math.random().toString(36).slice(2,8)}`}
  function pushHistory(s,e){s.history=s.history||[];s.history.unshift({id:uid('h'),at:new Date().toISOString(),...e});s.history=s.history.slice(0,200)}
  function seed(){const s=load();if(!s.albums.length)s.albums=[{id:'polska-krolewska',name:'Polska królewska',description:'Monety władców Polski'},{id:'srebro',name:'Srebro',description:'Monety srebrne'},{id:'do-opracowania',name:'Do opracowania',description:'Monety wymagające identyfikacji'}];if(!s.events.length)s.events=[{id:'demo-auction',date:'DO UZUPEŁNIENIA',title:'Przykładowa aukcja',house:'Dom aukcyjny – DO UZUPEŁNIENIA'}];save(s);return s}
  function upsertCoin(c){const s=load(),old=c.id?s.coins.find(x=>x.id===c.id):null,item={...(old||{}),id:c.id||uid('coin'),createdAt:old?.createdAt||c.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString(),...c};const i=s.coins.findIndex(x=>x.id===item.id);if(i>=0)s.coins[i]=item;else s.coins.unshift(item);pushHistory(s,{type:i>=0?'coin_updated':'coin_created',coinId:item.id,title:item.title||'Moneta'});save(s);return item}
  function getCoin(id){return load().coins.find(x=>x.id===id)||null}
  function deleteCoin(id){const s=load(),c=s.coins.find(x=>x.id===id);s.coins=s.coins.filter(x=>x.id!==id);pushHistory(s,{type:'coin_deleted',coinId:id,title:c?.title||'Moneta'});save(s)}
  function addToWatchlist(item){const s=load();s.watchlist=s.watchlist||[];if(!s.watchlist.some(x=>x.id===item.id))s.watchlist.unshift(item);save(s)}
  function createAlbum(name,description=''){const s=load(),album={id:uid('album'),name:String(name||'Nowy album').trim(),description:String(description||'').trim(),createdAt:new Date().toISOString()};s.albums.unshift(album);pushHistory(s,{type:'album_created',albumId:album.id,title:album.name});save(s);return album}
  function assignCoinToAlbum(coinId,albumId){const s=load(),i=s.coins.findIndex(x=>x.id===coinId);if(i<0)return null;const ids=Array.isArray(s.coins[i].albumIds)?s.coins[i].albumIds:[];if(!ids.includes(albumId))ids.push(albumId);s.coins[i]={...s.coins[i],albumIds:ids,updatedAt:new Date().toISOString()};pushHistory(s,{type:'coin_added_to_album',coinId,albumId,title:s.coins[i].title||'Moneta'});save(s);return s.coins[i]}
  function removeCoinFromAlbum(coinId,albumId){const s=load(),i=s.coins.findIndex(x=>x.id===coinId);if(i<0)return null;s.coins[i]={...s.coins[i],albumIds:(s.coins[i].albumIds||[]).filter(x=>x!==albumId),updatedAt:new Date().toISOString()};pushHistory(s,{type:'coin_removed_from_album',coinId,albumId,title:s.coins[i].title||'Moneta'});save(s);return s.coins[i]}
  return{load,save,seed,uid,upsertCoin,getCoin,deleteCoin,addToWatchlist,createAlbum,assignCoinToAlbum,removeCoinFromAlbum};
})();
window.ApoMonet=ApoMonet;ApoMonet.seed();
if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{}));