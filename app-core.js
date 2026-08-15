const ApoMonet=(()=>{
  const KEY='apomonet_state_v2';
  const defaults={coins:[],albums:[],watchlist:[],events:[],settings:{currency:'PLN'},history:[]};
  const clone=x=>JSON.parse(JSON.stringify(x));
  function load(){
    try{
      const raw=JSON.parse(localStorage.getItem(KEY)||'{}');
      return {
        ...clone(defaults),...raw,
        coins:Array.isArray(raw.coins)?raw.coins:[],
        albums:Array.isArray(raw.albums)?raw.albums:[],
        watchlist:Array.isArray(raw.watchlist)?raw.watchlist:[],
        events:Array.isArray(raw.events)?raw.events:[],
        history:Array.isArray(raw.history)?raw.history:[],
        settings:{...defaults.settings,...(raw.settings&&typeof raw.settings==='object'?raw.settings:{})}
      };
    }catch(e){return clone(defaults)}
  }
  function save(s){
    try{localStorage.setItem(KEY,JSON.stringify(s));return true}
    catch(cause){
      const quota=cause?.name==='QuotaExceededError'||cause?.code===22;
      const error=new Error(quota?'Brakuje miejsca na zapis zdjęć. Dane nie zostały nadpisane. Utwórz kopię zapasową i usuń zbędne duże zdjęcia.':'Nie udało się bezpiecznie zapisać danych lokalnie. Spróbuj ponownie.');
      error.code='APOMONET_STORAGE_WRITE_FAILED';error.cause=cause;throw error;
    }
  }
  function uid(p='id'){return `${p}_${Date.now()}_${Math.random().toString(36).slice(2,8)}`}
  function pushHistory(s,e){s.history=s.history||[];s.history.unshift({id:uid('h'),at:new Date().toISOString(),...e});s.history=s.history.slice(0,200)}
  function seed(){const s=load();if(!Array.isArray(s.albums)||!s.albums.length){s.albums=[{id:'polska-krolewska',name:'Polska królewska',description:'Monety władców Polski'},{id:'srebro',name:'Srebro',description:'Monety srebrne'},{id:'do-opracowania',name:'Do opracowania',description:'Monety wymagające identyfikacji'}];save(s)}return s}
  function upsertCoin(c){const s=load(),old=c.id?s.coins.find(x=>x.id===c.id):null,item={...(old||{}),id:c.id||uid('coin'),createdAt:old?.createdAt||c.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString(),...c};const i=s.coins.findIndex(x=>x.id===item.id);if(i>=0)s.coins[i]=item;else s.coins.unshift(item);pushHistory(s,{type:i>=0?'coin_updated':'coin_created',coinId:item.id,title:item.title||'Moneta'});save(s);return item}
  function getCoin(id){return load().coins.find(x=>x.id===id)||null}
  function deleteCoin(id){const s=load();s.coins=s.coins.filter(x=>x.id!==id);save(s)}
  function addToWatchlist(item){const s=load();s.watchlist=s.watchlist||[];if(!s.watchlist.some(x=>x.id===item.id))s.watchlist.unshift(item);save(s)}
  function createAlbum(name,description=''){const s=load(),n=String(name||'').trim();if(!n)return null;const album={id:uid('album'),name:n,description:String(description||'').trim(),createdAt:new Date().toISOString()};s.albums=s.albums||[];s.albums.unshift(album);pushHistory(s,{type:'album_created',albumId:album.id,title:album.name});save(s);return album}
  function assignCoinToAlbum(coinId,albumId){const s=load(),i=s.coins.findIndex(x=>x.id===coinId);if(i<0)return null;const ids=Array.isArray(s.coins[i].albumIds)?[...s.coins[i].albumIds]:[];if(!ids.includes(albumId))ids.push(albumId);s.coins[i]={...s.coins[i],albumIds:ids,updatedAt:new Date().toISOString()};save(s);return s.coins[i]}
  function removeCoinFromAlbum(coinId,albumId){const s=load(),i=s.coins.findIndex(x=>x.id===coinId);if(i<0)return null;s.coins[i]={...s.coins[i],albumIds:(s.coins[i].albumIds||[]).filter(x=>x!==albumId)};save(s);return s.coins[i]}
  function moveCoinBetweenAlbums(coinId,fromAlbumId,toAlbumId){const s=load(),i=s.coins.findIndex(x=>x.id===coinId);if(i<0)return null;let ids=Array.isArray(s.coins[i].albumIds)?[...s.coins[i].albumIds]:[];if(fromAlbumId)ids=ids.filter(x=>x!==fromAlbumId);if(toAlbumId&&!ids.includes(toAlbumId))ids.push(toAlbumId);s.coins[i]={...s.coins[i],albumIds:ids,updatedAt:new Date().toISOString()};save(s);return s.coins[i]}
  return {load,save,seed,uid,upsertCoin,getCoin,deleteCoin,addToWatchlist,createAlbum,assignCoinToAlbum,removeCoinFromAlbum,moveCoinBetweenAlbums};
})();
window.ApoMonet=ApoMonet;

addEventListener('error',event=>{
  if(event?.error?.code!=='APOMONET_STORAGE_WRITE_FAILED')return;
  const status=document.getElementById('status')||document.getElementById('saved');
  if(status)status.textContent=event.error.message;
});
try{ApoMonet.seed()}catch(error){
  console.error(error);
  addEventListener('DOMContentLoaded',()=>{
    const status=document.getElementById('status')||document.getElementById('saved');
    if(status)status.textContent=error.message;
  },{once:true});
}

const ApoI18n=(()=>{
  const KEY='apomonet_language_v2';
  const langs={pl:'Polski',en:'English',de:'Deutsch',fr:'Français'};
  const T={
    'Start':{en:'Home',de:'Start',fr:'Accueil'},'Analiza':{en:'Analysis',de:'Analyse',fr:'Analyse'},
    'Kolekcja':{en:'Collection',de:'Sammlung',fr:'Collection'},'Albumy':{en:'Albums',de:'Alben',fr:'Albums'},
    'Kalendarz':{en:'Calendar',de:'Kalender',fr:'Calendrier'},'Aukcje':{en:'Auctions',de:'Auktionen',fr:'Enchères'},
    'Domy aukcyjne':{en:'Auction houses',de:'Auktionshäuser',fr:'Maisons de vente'},
    'Moje domy aukcyjne':{en:'My auction houses',de:'Meine Auktionshäuser',fr:'Mes maisons de vente'},
    'Moje albumy':{en:'My albums',de:'Meine Alben',fr:'Mes albums'},'Moje monety':{en:'My coins',de:'Meine Münzen',fr:'Mes monnaies'},
    'Analiza monety':{en:'Coin analysis',de:'Münzanalyse',fr:'Analyse de monnaie'},
    'Awers':{en:'Obverse',de:'Vorderseite',fr:'Avers'},'Rewers':{en:'Reverse',de:'Rückseite',fr:'Revers'},
    'Szybka analiza':{en:'Quick analysis',de:'Schnellanalyse',fr:'Analyse rapide'},
    'Szukaj':{en:'Search',de:'Suchen',fr:'Rechercher'},'+ Nowy album':{en:'+ New album',de:'+ Neues Album',fr:'+ Nouvel album'},
    'Zaznacz wszystko':{en:'Select all',de:'Alle auswählen',fr:'Tout sélectionner'},
    'Odznacz wszystko':{en:'Deselect all',de:'Auswahl aufheben',fr:'Tout désélectionner'},
    'PDF z wybranych':{en:'PDF from selected',de:'PDF aus Auswahl',fr:'PDF de la sélection'},
    'Udostępnij wybrane':{en:'Share selected',de:'Auswahl teilen',fr:'Partager la sélection'},
    'Wyczyść filtry':{en:'Clear filters',de:'Filter löschen',fr:'Effacer les filtres'},
    'Lista':{en:'List',de:'Liste',fr:'Liste'},'Małe kafelki':{en:'Small tiles',de:'Kleine Kacheln',fr:'Petites vignettes'},
    'Duże kafelki':{en:'Large tiles',de:'Große Kacheln',fr:'Grandes vignettes'},
    'Otwórz':{en:'Open',de:'Öffnen',fr:'Ouvrir'},'Rynek':{en:'Market',de:'Markt',fr:'Marché'},
    'Wszystkie regiony':{en:'All regions',de:'Alle Regionen',fr:'Toutes les régions'},
    'Polska':{en:'Poland',de:'Polen',fr:'Pologne'},'Europa':{en:'Europe',de:'Europa',fr:'Europe'},'Świat':{en:'World',de:'Welt',fr:'Monde'},
    'Karta monety':{en:'Coin card',de:'Münzkarte',fr:'Fiche monnaie'},'Dane':{en:'Data',de:'Daten',fr:'Données'},
    'Władca:':{en:'Ruler:',de:'Herrscher:',fr:'Souverain:'},'Rok:':{en:'Year:',de:'Jahr:',fr:'Année:'},
    'Nominał:':{en:'Denomination:',de:'Nominal:',fr:'Valeur:'},'Mennica:':{en:'Mint:',de:'Münzstätte:',fr:'Atelier:'},
    'Stan:':{en:'Grade:',de:'Erhaltung:',fr:'État:'},'Rzadkość:':{en:'Rarity:',de:'Seltenheit:',fr:'Rareté:'},
    'Wycena:':{en:'Estimate:',de:'Schätzung:',fr:'Estimation:'},'Pewność AI:':{en:'AI confidence:',de:'KI-Sicherheit:',fr:'Confiance IA:'},
    'Dodaj awers i rewers.':{en:'Add obverse and reverse.',de:'Vorder- und Rückseite hinzufügen.',fr:'Ajoutez l’avers et le revers.'}
  };
  const originals=new WeakMap();
  function current(){return localStorage.getItem(KEY)||'pl'}
  function tr(s,l=current()){return l==='pl'?s:(T[s]?.[l]||s)}
  function translate(root=document.body){
    const l=current();document.documentElement.lang=l;
    const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let n;
    while(n=w.nextNode()){
      if(!n.parentElement||['SCRIPT','STYLE'].includes(n.parentElement.tagName))continue;
      const raw=n.nodeValue,trim=raw.trim();if(!trim)continue;
      if(!originals.has(n))originals.set(n,trim);
      const src=originals.get(n),dst=tr(src,l);
      if(dst!==src||l==='pl')n.nodeValue=raw.replace(trim,l==='pl'?src:dst);
    }
    document.querySelectorAll('input[placeholder]').forEach(el=>{if(!el.dataset.i18nPh)el.dataset.i18nPh=el.placeholder;el.placeholder=tr(el.dataset.i18nPh,l)});
  }
  function mount(){
    if(document.getElementById('apomonetLang'))return;
    const box=document.createElement('div');box.id='apomonetLang';box.style.cssText='position:fixed;right:10px;top:10px;z-index:9999;background:#111;border:1px solid #3b3b3f;border-radius:12px;padding:5px 7px;box-shadow:0 4px 18px #0008';
    const s=document.createElement('select');s.style.cssText='background:#111;color:#fff;border:0;font-size:14px;padding:5px';s.setAttribute('aria-label','Language');
    Object.entries(langs).forEach(([v,t])=>{const o=document.createElement('option');o.value=v;o.textContent=t;s.appendChild(o)});s.value=current();
    s.onchange=()=>{
      localStorage.setItem(KEY,s.value);
      window.dispatchEvent(new CustomEvent('apomonet:language-change',{detail:{language:s.value}}));
      location.reload();
    };box.appendChild(s);document.body.appendChild(box);
  }
  function init(){mount();translate()}
  return {current,tr,translate,mount,init};
})();
window.ApoI18n=ApoI18n;

(function ApoHotfix(){
  function onReady(fn){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',fn);else fn()}
  function safeImageProcessor(){
    if(!location.pathname.endsWith('/analyze.html')&&!location.pathname.endsWith('analyze.html'))return;
    document.querySelectorAll('input[type=file][capture]').forEach(i=>i.removeAttribute('capture'));
    const note=document.querySelector('.photo-note');if(note)note.textContent='ApoMonet przygotowuje lekki kadr z bezpiecznym marginesem. Przy niepewnym wykryciu zachowuje całe zdjęcie, żeby nie uciąć daty, legendy ani rantu.';
    const hero=document.querySelector('.hero.compact p');if(hero)hero.textContent='Dotknij kafla awersu lub rewersu i wybierz: aparat albo galerię.';
    window.ApoImagePipeline?.install?.();
    document.querySelectorAll('.capture-card').forEach(label=>{
      label.addEventListener('click',e=>{
        if(label.dataset.choiceOpen==='1')return;
        e.preventDefault();e.stopPropagation();
        const input=document.getElementById(label.getAttribute('for'));if(!input)return;
        label.dataset.choiceOpen='1';
        const bg=document.createElement('div');bg.style.cssText='position:fixed;inset:0;background:#000b;z-index:10000;display:grid;place-items:center;padding:20px';
        const box=document.createElement('div');box.style.cssText='width:min(420px,100%);background:#151517;border:1px solid #444;border-radius:20px;padding:18px';
        box.innerHTML='<h3 style="margin-top:0">Dodaj zdjęcie</h3><p style="color:#aaa">Wybierz źródło zdjęcia.</p>';
        const mk=(txt,cam)=>{const b=document.createElement('button');b.className='btn '+(cam?'primary':'secondary')+' full';b.style.marginTop='8px';b.textContent=txt;b.onclick=()=>{cam?input.setAttribute('capture','environment'):input.removeAttribute('capture');bg.remove();label.dataset.choiceOpen='0';input.click()};return b};
        box.appendChild(mk('📷 Zrób zdjęcie',true));box.appendChild(mk('🖼️ Wybierz z galerii',false));
        const cancel=mk('Anuluj',false);cancel.onclick=()=>{bg.remove();label.dataset.choiceOpen='0'};box.appendChild(cancel);bg.appendChild(box);document.body.appendChild(bg);
      },true);
    });
  }
  function fixNewAlbum(){
    if(!location.pathname.endsWith('albums.html'))return;
    const btn=[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Nowy album'));if(!btn)return;
    const grid=document.querySelector('.album-grid');
    const showCustom=()=>{if(!grid)return;grid.querySelectorAll('[data-custom-album]').forEach(x=>x.remove());(ApoMonet.load().albums||[]).filter(a=>a.id.startsWith('album_')).forEach(a=>{const el=document.createElement('article');el.className='album album-cover';el.dataset.customAlbum=a.id;el.innerHTML=`<div><span class="album-tag">Własny</span><h2>${a.name}</h2><p class="muted">${a.description||'Pusty album — gotowy na Twoje monety.'}</p><div class="album-stats">Album użytkownika</div></div><div class="cover-coins"><div class="cover-coin"></div><div class="cover-coin"></div><div class="cover-coin"></div><div class="cover-coin"></div></div>`;grid.prepend(el)})};
    btn.onclick=()=>{const name=prompt('Nazwa nowego albumu:');if(!name||!name.trim())return;ApoMonet.createAlbum(name.trim());showCustom();alert(`Album „${name.trim()}” został utworzony.`)};showCustom();
  }
  function stickySelection(){
    if(!location.pathname.endsWith('album.html'))return;
    const bar=document.createElement('div');bar.id='apomonetSelectionBar';bar.style.cssText='position:fixed;left:10px;right:10px;bottom:68px;z-index:9998;background:#121214ee;border:1px solid #6b4814;border-radius:16px;padding:10px;display:none;gap:8px;align-items:center;box-shadow:0 8px 30px #000a';
    const info=document.createElement('strong');info.style.flex='1';const pdf=document.createElement('button');pdf.className='btn primary';pdf.textContent='PDF';pdf.onclick=()=>document.getElementById('pdfSelected')?.click();
    const share=document.createElement('button');share.className='btn secondary';share.textContent='Udostępnij';share.onclick=()=>document.getElementById('shareSelected')?.click();
    bar.append(info,pdf,share);document.body.appendChild(bar);
    const update=()=>{const n=document.querySelectorAll('.coin-pick:checked').length;info.textContent=`Zaznaczono: ${n}`;bar.style.display=n?'flex':'none'};
    document.addEventListener('change',e=>{if(e.target.matches?.('.coin-pick'))setTimeout(update,0)});setTimeout(update,100);
  }
  function fixCoinCard(){
    if(!location.pathname.endsWith('coin.html'))return;
    const p=new URLSearchParams(location.search),id=p.get('id');const s=ApoMonet.load();const c=(id&&ApoMonet.getCoin(id))||s.coins?.[0];if(!c)return;
    const h=document.querySelector('.hero h1');if(h)h.textContent=c.title||[c.nominal,c.year].filter(Boolean).join(' ')||'Moneta';
    const cards=document.querySelectorAll('section.grid.two .card');const putImg=(card,src,label)=>{if(!card||!src)return;const emp=card.querySelector('.empty');if(emp)emp.innerHTML=`<img src="${src}" alt="${label}" style="width:100%;max-height:360px;object-fit:contain;border-radius:14px">`};
    putImg(cards[0],c.obverseImage,'Awers');putImg(cards[1],c.reverseImage,'Rewers');
    const ps=document.querySelectorAll('section.grid.two:nth-of-type(2) p');const vals=[c.ruler,c.year,c.nominal,c.mint,c.grade,c.rarity||c.kopickiRarity,c.estimatedValue||c.valuation,c.confidence?c.confidence+'%':null];
    ps.forEach((el,i)=>{const b=el.querySelector('b');if(b)el.innerHTML=b.outerHTML+' '+(vals[i]||'Nie ustalono')});
    document.querySelectorAll('.todo').forEach(x=>x.textContent='DANE MONETY');
  }
  function ensureStarySklep(){
    if(!document.body.innerText.toLowerCase().includes('domy aukcyjne'))return;
    const list=document.querySelector('.house-list');if(!list||list.innerText.includes('Stary Sklep'))return;
    const a=document.createElement('article');a.className='house featured';a.innerHTML='<div><span class="tester-badge">★ Pierwszy tester APOMONET</span><h3>Stary Sklep — Sylwester Kopyciński</h3><p>Pierwszy tester APOMONET — profil partnera testowego.</p></div><a class="btn secondary" href="auction-house.html?id=stary-sklep">Otwórz</a>';list.prepend(a);
  }
  onReady(()=>{ApoI18n.init();setTimeout(()=>{safeImageProcessor();fixNewAlbum();stickySelection();fixCoinCard();ensureStarySklep();ApoI18n.translate()},0)});
})();
