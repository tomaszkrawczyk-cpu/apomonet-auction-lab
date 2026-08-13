const ApoMonet = (() => {
  const KEY='apomonet_state_v2';
  const defaults={coins:[],albums:[],watchlist:[],events:[],settings:{currency:'PLN'},history:[]};
  function cloneDefaults(){return JSON.parse(JSON.stringify(defaults))}
  function load(){
    try{
      const raw=JSON.parse(localStorage.getItem(KEY)||'{}');
      return {
        ...cloneDefaults(),...raw,
        coins:Array.isArray(raw.coins)?raw.coins:[],
        albums:Array.isArray(raw.albums)?raw.albums:[],
        watchlist:Array.isArray(raw.watchlist)?raw.watchlist:[],
        events:Array.isArray(raw.events)?raw.events:[],
        history:Array.isArray(raw.history)?raw.history:[],
        settings:{...defaults.settings,...(raw.settings||{})}
      };
    }catch{return cloneDefaults()}
  }
  function save(s){localStorage.setItem(KEY,JSON.stringify(s))}
  function uid(p='id'){return `${p}_${Date.now()}_${Math.random().toString(36).slice(2,8)}`}
  function pushHistory(s,e){s.history=s.history||[];s.history.unshift({id:uid('h'),at:new Date().toISOString(),...e});s.history=s.history.slice(0,200)}
  function seed(){
    const s=load();
    // IMPORTANT: seed is additive only. Never clear user coins, history or sessions during app startup.
    if(!s.albums.length)s.albums=[{id:'polska-krolewska',name:'Polska królewska',description:'Monety władców Polski'},{id:'srebro',name:'Srebro',description:'Monety srebrne'},{id:'do-opracowania',name:'Do opracowania',description:'Monety wymagające identyfikacji'}];
    if(!s.events.length)s.events=[{id:'demo-auction',date:'DO UZUPEŁNIENIA',title:'Przykładowa aukcja',house:'Dom aukcyjny – DO UZUPEŁNIENIA'}];
    save(s);return s
  }
  function upsertCoin(c){const s=load(),old=c.id?s.coins.find(x=>x.id===c.id):null,item={...(old||{}),id:c.id||uid('coin'),createdAt:old?.createdAt||c.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString(),...c};const i=s.coins.findIndex(x=>x.id===item.id);if(i>=0)s.coins[i]=item;else s.coins.unshift(item);pushHistory(s,{type:i>=0?'coin_updated':'coin_created',coinId:item.id,title:item.title||'Moneta'});save(s);return item}
  function getCoin(id){return load().coins.find(x=>x.id===id)||null}
  function deleteCoin(id){const s=load(),c=s.coins.find(x=>x.id===id);s.coins=s.coins.filter(x=>x.id!==id);pushHistory(s,{type:'coin_deleted',coinId:id,title:c?.title||'Moneta'});save(s)}
  function addToWatchlist(item){const s=load();s.watchlist=s.watchlist||[];if(!s.watchlist.some(x=>x.id===item.id))s.watchlist.unshift(item);save(s)}
  function createAlbum(name,description=''){const s=load(),album={id:uid('album'),name:String(name||'Nowy album').trim(),description:String(description||'').trim(),createdAt:new Date().toISOString()};s.albums.unshift(album);pushHistory(s,{type:'album_created',albumId:album.id,title:album.name});save(s);return album}
  function assignCoinToAlbum(coinId,albumId){const s=load(),i=s.coins.findIndex(x=>x.id===coinId);if(i<0)return null;const ids=Array.isArray(s.coins[i].albumIds)?[...s.coins[i].albumIds]:[];if(!ids.includes(albumId))ids.push(albumId);s.coins[i]={...s.coins[i],albumIds:ids,updatedAt:new Date().toISOString()};pushHistory(s,{type:'coin_added_to_album',coinId,albumId,title:s.coins[i].title||'Moneta'});save(s);return s.coins[i]}
  function removeCoinFromAlbum(coinId,albumId){const s=load(),i=s.coins.findIndex(x=>x.id===coinId);if(i<0)return null;s.coins[i]={...s.coins[i],albumIds:(s.coins[i].albumIds||[]).filter(x=>x!==albumId),updatedAt:new Date().toISOString()};pushHistory(s,{type:'coin_removed_from_album',coinId,albumId,title:s.coins[i].title||'Moneta'});save(s);return s.coins[i]}
  function moveCoinBetweenAlbums(coinId,fromAlbumId,toAlbumId){const s=load(),i=s.coins.findIndex(x=>x.id===coinId);if(i<0)return null;let ids=Array.isArray(s.coins[i].albumIds)?[...s.coins[i].albumIds]:[];if(fromAlbumId)ids=ids.filter(x=>x!==fromAlbumId);if(toAlbumId&&!ids.includes(toAlbumId))ids.push(toAlbumId);s.coins[i]={...s.coins[i],albumIds:ids,updatedAt:new Date().toISOString()};pushHistory(s,{type:'coin_moved_between_albums',coinId,fromAlbumId,toAlbumId,title:s.coins[i].title||'Moneta'});save(s);return s.coins[i]}
  return{load,save,seed,uid,upsertCoin,getCoin,deleteCoin,addToWatchlist,createAlbum,assignCoinToAlbum,removeCoinFromAlbum,moveCoinBetweenAlbums};
})();
window.ApoMonet=ApoMonet;ApoMonet.seed();

/* Global multilingual UI foundation. Numismatic data is intentionally not auto-translated. */
const ApoI18n=(()=>{
  const KEY='apomonet_language_v1';
  const langs={pl:'Polski',en:'English',de:'Deutsch',fr:'Français',es:'Español',it:'Italiano',cs:'Čeština',uk:'Українська',ru:'Русский'};
  const T={
    'Start':{en:'Home',de:'Start',fr:'Accueil',es:'Inicio',it:'Home',cs:'Domů',uk:'Головна',ru:'Главная'},
    'Analiza':{en:'Analysis',de:'Analyse',fr:'Analyse',es:'Análisis',it:'Analisi',cs:'Analýza',uk:'Аналіз',ru:'Анализ'},
    'Kolekcja':{en:'Collection',de:'Sammlung',fr:'Collection',es:'Colección',it:'Collezione',cs:'Sbírka',uk:'Колекція',ru:'Коллекция'},
    'Albumy':{en:'Albums',de:'Alben',fr:'Albums',es:'Álbumes',it:'Album',cs:'Alba',uk:'Альбоми',ru:'Альбомы'},
    'Kalendarz':{en:'Calendar',de:'Kalender',fr:'Calendrier',es:'Calendario',it:'Calendario',cs:'Kalendář',uk:'Календар',ru:'Календарь'},
    'Aukcje':{en:'Auctions',de:'Auktionen',fr:'Enchères',es:'Subastas',it:'Aste',cs:'Aukce',uk:'Аукціони',ru:'Аукционы'},
    'Domy aukcyjne':{en:'Auction houses',de:'Auktionshäuser',fr:'Maisons de vente',es:'Casas de subastas',it:'Case d’asta',cs:'Aukční domy',uk:'Аукціонні доми',ru:'Аукционные дома'},
    'Moje albumy':{en:'My albums',de:'Meine Alben',fr:'Mes albums',es:'Mis álbumes',it:'I miei album',cs:'Moje alba',uk:'Мої альбоми',ru:'Мои альбомы'},
    'Moja kolekcja':{en:'My collection',de:'Meine Sammlung',fr:'Ma collection',es:'Mi colección',it:'La mia collezione',cs:'Moje sbírka',uk:'Моя колекція',ru:'Моя коллекция'},
    'Cele kolekcjonerskie':{en:'Collecting goals',de:'Sammelziele',fr:'Objectifs de collection',es:'Objetivos de colección',it:'Obiettivi di collezione',cs:'Sběratelské cíle',uk:'Цілі колекції',ru:'Цели коллекции'},
    'Monety marzeń':{en:'Dream coins',de:'Traummünzen',fr:'Pièces de rêve',es:'Monedas soñadas',it:'Monete dei sogni',cs:'Mince snů',uk:'Монети мрії',ru:'Монеты мечты'},
    'Moje monety':{en:'My coins',de:'Meine Münzen',fr:'Mes monnaies',es:'Mis monedas',it:'Le mie monete',cs:'Moje mince',uk:'Мої монети',ru:'Мои монеты'},
    'Szukaj po roku, władcy, nominale…':{en:'Search by year, ruler, denomination…',de:'Nach Jahr, Herrscher, Nominal suchen…',fr:'Rechercher par année, souverain, valeur…',es:'Buscar por año, gobernante, denominación…',it:'Cerca per anno, sovrano, nominale…',cs:'Hledat podle roku, panovníka, nominálu…',uk:'Пошук за роком, правителем, номіналом…',ru:'Поиск по году, правителю, номиналу…'},
    'Language':{pl:'Język',en:'Language',de:'Sprache',fr:'Langue',es:'Idioma',it:'Lingua',cs:'Jazyk',uk:'Мова',ru:'Язык'},
    'Lista':{en:'List',de:'Liste',fr:'Liste',es:'Lista',it:'Elenco',cs:'Seznam',uk:'Список',ru:'Список'},
    'Małe kafelki':{en:'Small tiles',de:'Kleine Kacheln',fr:'Petites vignettes',es:'Tarjetas pequeñas',it:'Riquadri piccoli',cs:'Malé dlaždice',uk:'Малі плитки',ru:'Малые плитки'},
    'Duże kafelki':{en:'Large tiles',de:'Große Kacheln',fr:'Grandes vignettes',es:'Tarjetas grandes',it:'Riquadri grandi',cs:'Velké dlaždice',uk:'Великі плитки',ru:'Большие плитки'},
    'Wyczyść filtry':{en:'Clear filters',de:'Filter löschen',fr:'Effacer les filtres',es:'Borrar filtros',it:'Cancella filtri',cs:'Vymazat filtry',uk:'Очистити фільтри',ru:'Очистить фильтры'},
    'Zaznacz wszystko':{en:'Select all',de:'Alle auswählen',fr:'Tout sélectionner',es:'Seleccionar todo',it:'Seleziona tutto',cs:'Vybrat vše',uk:'Вибрати все',ru:'Выбрать все'},
    'Odznacz wszystko':{en:'Deselect all',de:'Auswahl aufheben',fr:'Tout désélectionner',es:'Deseleccionar todo',it:'Deseleziona tutto',cs:'Zrušit výběr',uk:'Зняти вибір',ru:'Снять выбор'},
    'PDF z wybranych':{en:'PDF from selected',de:'PDF aus Auswahl',fr:'PDF de la sélection',es:'PDF de seleccionadas',it:'PDF selezionati',cs:'PDF z vybraných',uk:'PDF з вибраних',ru:'PDF из выбранных'},
    'Udostępnij wybrane':{en:'Share selected',de:'Auswahl teilen',fr:'Partager la sélection',es:'Compartir seleccionadas',it:'Condividi selezionati',cs:'Sdílet vybrané',uk:'Поділитися вибраними',ru:'Поделиться выбранными'},
    'Przenieś do…':{en:'Move to…',de:'Verschieben nach…',fr:'Déplacer vers…',es:'Mover a…',it:'Sposta in…',cs:'Přesunout do…',uk:'Перемістити до…',ru:'Переместить в…'},
    'Wróć':{en:'Back',de:'Zurück',fr:'Retour',es:'Volver',it:'Indietro',cs:'Zpět',uk:'Назад',ru:'Назад'}
  };
  function current(){return localStorage.getItem(KEY)||'pl'}
  function tr(text,lang=current()){const x=T[text];return lang==='pl'||!x?text:(x[lang]||text)}
  function translateDOM(){
    const lang=current();document.documentElement.lang=lang;
    const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT),nodes=[];
    while(walker.nextNode())nodes.push(walker.currentNode);
    nodes.forEach(n=>{if(n.parentElement&&['SCRIPT','STYLE','TEXTAREA','OPTION'].includes(n.parentElement.tagName))return;const raw=n.nodeValue,trim=raw.trim();if(!trim)return;if(!n.parentElement.dataset.i18nOriginal)n.parentElement.dataset.i18nOriginal=trim;const original=n.parentElement.dataset.i18nOriginal;if(T[original])n.nodeValue=raw.replace(trim,tr(original,lang))});
    document.querySelectorAll('option').forEach(el=>{if(!el.dataset.i18nOriginal)el.dataset.i18nOriginal=el.textContent.trim();el.textContent=tr(el.dataset.i18nOriginal,lang)});
    document.querySelectorAll('[placeholder],[title],[aria-label]').forEach(el=>{
      ['placeholder','title','aria-label'].forEach(attr=>{
        if(!el.hasAttribute(attr))return;
        const key='i18n'+attr.replace(/(^|-)([a-z])/g,(_,a,b)=>b.toUpperCase())+'Original';
        if(!el.dataset[key])el.dataset[key]=el.getAttribute(attr);
        el.setAttribute(attr,tr(el.dataset[key],lang));
      });
    });
  }
  function mount(){if(document.getElementById('apomonetLang'))return;const box=document.createElement('div');box.id='apomonetLang';box.style.cssText='position:fixed;right:10px;top:10px;z-index:9999;background:#111;border:1px solid #3b3b3f;border-radius:12px;padding:5px 7px';const sel=document.createElement('select');sel.setAttribute('aria-label','Language');sel.style.cssText='background:#111;color:#fff;border:0;font:inherit;max-width:130px';Object.entries(langs).forEach(([code,name])=>{const o=document.createElement('option');o.value=code;o.textContent=name;sel.appendChild(o)});sel.value=current();sel.onchange=()=>{localStorage.setItem(KEY,sel.value);location.reload()};box.appendChild(sel);document.body.appendChild(box);translateDOM()}
  return{current,tr,mount,translateDOM,langs};
})();
window.ApoI18n=ApoI18n;window.addEventListener('DOMContentLoaded',()=>ApoI18n.mount());

if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{}));