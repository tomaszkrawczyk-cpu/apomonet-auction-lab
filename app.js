const ApoMonet = (() => {
  const KEY='apomonet_state_v2';
  const RESET_KEY='apomonet_prototype_coin_reset_20260813';
  const defaults={coins:[],albums:[],watchlist:[],events:[],settings:{currency:'PLN'},history:[]};
  function load(){try{return{...defaults,...(JSON.parse(localStorage.getItem(KEY)||'{}'))}}catch{return structuredClone(defaults)}}
  function save(s){localStorage.setItem(KEY,JSON.stringify(s))}
  function uid(p='id'){return `${p}_${Date.now()}_${Math.random().toString(36).slice(2,8)}`}
  function pushHistory(s,e){s.history=s.history||[];s.history.unshift({id:uid('h'),at:new Date().toISOString(),...e});s.history=s.history.slice(0,200)}
  function seed(){const s=load();if(!localStorage.getItem(RESET_KEY)){s.coins=[];s.history=(s.history||[]).filter(h=>!h.coinId);sessionStorage.removeItem('apomonet_analysis_session');sessionStorage.removeItem('apomonet_export_ids');localStorage.setItem(RESET_KEY,'1')}if(!s.albums.length)s.albums=[{id:'polska-krolewska',name:'Polska królewska',description:'Monety władców Polski'},{id:'srebro',name:'Srebro',description:'Monety srebrne'},{id:'do-opracowania',name:'Do opracowania',description:'Monety wymagające identyfikacji'}];if(!s.events.length)s.events=[{id:'demo-auction',date:'DO UZUPEŁNIENIA',title:'Przykładowa aukcja',house:'Dom aukcyjny – DO UZUPEŁNIENIA'}];save(s);return s}
  function upsertCoin(c){const s=load(),old=c.id?s.coins.find(x=>x.id===c.id):null,item={...(old||{}),id:c.id||uid('coin'),createdAt:old?.createdAt||c.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString(),...c};const i=s.coins.findIndex(x=>x.id===item.id);if(i>=0)s.coins[i]=item;else s.coins.unshift(item);pushHistory(s,{type:i>=0?'coin_updated':'coin_created',coinId:item.id,title:item.title||'Moneta'});save(s);return item}
  function getCoin(id){return load().coins.find(x=>x.id===id)||null}
  function deleteCoin(id){const s=load(),c=s.coins.find(x=>x.id===id);s.coins=s.coins.filter(x=>x.id!==id);pushHistory(s,{type:'coin_deleted',coinId:id,title:c?.title||'Moneta'});save(s)}
  function addToWatchlist(item){const s=load();s.watchlist=s.watchlist||[];if(!s.watchlist.some(x=>x.id===item.id))s.watchlist.unshift(item);save(s)}
  function createAlbum(name,description=''){const s=load(),album={id:uid('album'),name:String(name||'Nowy album').trim(),description:String(description||'').trim(),createdAt:new Date().toISOString()};s.albums.unshift(album);pushHistory(s,{type:'album_created',albumId:album.id,title:album.name});save(s);return album}
  function assignCoinToAlbum(coinId,albumId){const s=load(),i=s.coins.findIndex(x=>x.id===coinId);if(i<0)return null;const ids=Array.isArray(s.coins[i].albumIds)?s.coins[i].albumIds:[];if(!ids.includes(albumId))ids.push(albumId);s.coins[i]={...s.coins[i],albumIds:ids,updatedAt:new Date().toISOString()};pushHistory(s,{type:'coin_added_to_album',coinId,albumId,title:s.coins[i].title||'Moneta'});save(s);return s.coins[i]}
  function removeCoinFromAlbum(coinId,albumId){const s=load(),i=s.coins.findIndex(x=>x.id===coinId);if(i<0)return null;s.coins[i]={...s.coins[i],albumIds:(s.coins[i].albumIds||[]).filter(x=>x!==albumId),updatedAt:new Date().toISOString()};pushHistory(s,{type:'coin_removed_from_album',coinId,albumId,title:s.coins[i].title||'Moneta'});save(s);return s.coins[i]}
  function moveCoinBetweenAlbums(coinId,fromAlbumId,toAlbumId){const s=load(),i=s.coins.findIndex(x=>x.id===coinId);if(i<0)return null;let ids=Array.isArray(s.coins[i].albumIds)?[...s.coins[i].albumIds]:[];if(fromAlbumId)ids=ids.filter(x=>x!==fromAlbumId);if(toAlbumId&&!ids.includes(toAlbumId))ids.push(toAlbumId);s.coins[i]={...s.coins[i],albumIds:ids,updatedAt:new Date().toISOString()};pushHistory(s,{type:'coin_moved_between_albums',coinId,fromAlbumId,toAlbumId,title:s.coins[i].title||'Moneta'});save(s);return s.coins[i]}
  return{load,save,seed,uid,upsertCoin,getCoin,deleteCoin,addToWatchlist,createAlbum,assignCoinToAlbum,removeCoinFromAlbum,moveCoinBetweenAlbums};
})();
window.ApoMonet=ApoMonet;ApoMonet.seed();

/* Global multilingual UI foundation. Numismatic data is intentionally not auto-translated. */
const ApoI18n=(()=>{
  const KEY='apomonet_language_v1';
  const langs={pl:'Polski',en:'English',de:'Deutsch',fr:'Français',es:'Español',it:'Italiano',cs:'Čeština'};
  const T={
    'Start':{en:'Home',de:'Start',fr:'Accueil',es:'Inicio',it:'Home',cs:'Domů'},
    'Analiza':{en:'Analysis',de:'Analyse',fr:'Analyse',es:'Análisis',it:'Analisi',cs:'Analýza'},
    'Kolekcja':{en:'Collection',de:'Sammlung',fr:'Collection',es:'Colección',it:'Collezione',cs:'Sbírka'},
    'Albumy':{en:'Albums',de:'Alben',fr:'Albums',es:'Álbumes',it:'Album',cs:'Alba'},
    'Kalendarz':{en:'Calendar',de:'Kalender',fr:'Calendrier',es:'Calendario',it:'Calendario',cs:'Kalendář'},
    'Aukcje':{en:'Auctions',de:'Auktionen',fr:'Enchères',es:'Subastas',it:'Aste',cs:'Aukce'},
    'Domy aukcyjne':{en:'Auction houses',de:'Auktionshäuser',fr:'Maisons de vente',es:'Casas de subastas',it:'Case d’asta',cs:'Aukční domy'},
    'Moje albumy':{en:'My albums',de:'Meine Alben',fr:'Mes albums',es:'Mis álbumes',it:'I miei album',cs:'Moje alba'},
    'Moja kolekcja':{en:'My collection',de:'Meine Sammlung',fr:'Ma collection',es:'Mi colección',it:'La mia collezione',cs:'Moje sbírka'},
    'Cele kolekcjonerskie':{en:'Collecting goals',de:'Sammelziele',fr:'Objectifs de collection',es:'Objetivos de colección',it:'Obiettivi di collezione',cs:'Sběratelské cíle'},
    'Monety marzeń':{en:'Dream coins',de:'Traummünzen',fr:'Pièces de rêve',es:'Monedas soñadas',it:'Monete dei sogni',cs:'Mince snů'},
    'Moje monety':{en:'My coins',de:'Meine Münzen',fr:'Mes monnaies',es:'Mis monedas',it:'Le mie monete',cs:'Moje mince'},
    'Szukaj albumu…':{en:'Search albums…',de:'Alben suchen…',fr:'Rechercher des albums…',es:'Buscar álbumes…',it:'Cerca album…',cs:'Hledat alba…'},
    'Szukaj po roku, władcy, nominale…':{en:'Search by year, ruler, denomination…',de:'Nach Jahr, Herrscher, Nominal suchen…',fr:'Rechercher par année, souverain, valeur…',es:'Buscar por año, gobernante, denominación…',it:'Cerca per anno, sovrano, nominale…',cs:'Hledat podle roku, panovníka, nominálu…'},
    '+ Nowy album':{en:'+ New album',de:'+ Neues Album',fr:'+ Nouvel album',es:'+ Nuevo álbum',it:'+ Nuovo album',cs:'+ Nové album'},
    '+ Dodaj przez analizę':{en:'+ Add by analysis',de:'+ Per Analyse hinzufügen',fr:'+ Ajouter par analyse',es:'+ Añadir mediante análisis',it:'+ Aggiungi con analisi',cs:'+ Přidat analýzou'},
    '+ Dodaj ręcznie':{en:'+ Add manually',de:'+ Manuell hinzufügen',fr:'+ Ajouter manuellement',es:'+ Añadir manualmente',it:'+ Aggiungi manualmente',cs:'+ Přidat ručně'},
    'Podaj wartość mojej kolekcji':{en:'Estimate my collection value',de:'Wert meiner Sammlung schätzen',fr:'Estimer la valeur de ma collection',es:'Estimar el valor de mi colección',it:'Stima il valore della mia collezione',cs:'Odhadnout hodnotu mé sbírky'},
    'Kalkulator aukcyjny':{en:'Auction calculator',de:'Auktionsrechner',fr:'Calculateur d’enchères',es:'Calculadora de subastas',it:'Calcolatore d’asta',cs:'Aukční kalkulačka'},
    'Lista':{en:'List',de:'Liste',fr:'Liste',es:'Lista',it:'Elenco',cs:'Seznam'},
    'Małe kafelki':{en:'Small tiles',de:'Kleine Kacheln',fr:'Petites vignettes',es:'Tarjetas pequeñas',it:'Riquadri piccoli',cs:'Malé dlaždice'},
    'Duże kafelki':{en:'Large tiles',de:'Große Kacheln',fr:'Grandes vignettes',es:'Tarjetas grandes',it:'Riquadri grandi',cs:'Velké dlaždice'},
    'Wyczyść filtry':{en:'Clear filters',de:'Filter löschen',fr:'Effacer les filtres',es:'Borrar filtros',it:'Cancella filtri',cs:'Vymazat filtry'},
    'Przywróć układ demo':{en:'Reset demo layout',de:'Demo-Layout zurücksetzen',fr:'Réinitialiser la démo',es:'Restablecer demo',it:'Ripristina demo',cs:'Obnovit demo'},
    'Zaznacz wszystko':{en:'Select all',de:'Alle auswählen',fr:'Tout sélectionner',es:'Seleccionar todo',it:'Seleziona tutto',cs:'Vybrat vše'},
    'Odznacz wszystko':{en:'Deselect all',de:'Auswahl aufheben',fr:'Tout désélectionner',es:'Deseleccionar todo',it:'Deseleziona tutto',cs:'Zrušit výběr'},
    'PDF z wybranych':{en:'PDF from selected',de:'PDF aus Auswahl',fr:'PDF de la sélection',es:'PDF de seleccionadas',it:'PDF selezionati',cs:'PDF z vybraných'},
    'Udostępnij wybrane':{en:'Share selected',de:'Auswahl teilen',fr:'Partager la sélection',es:'Compartir seleccionadas',it:'Condividi selezionati',cs:'Sdílet vybrané'},
    'Sprawdź aukcje':{en:'Check auctions',de:'Auktionen prüfen',fr:'Voir les enchères',es:'Ver subastas',it:'Controlla aste',cs:'Zkontrolovat aukce'},
    'Przenieś do…':{en:'Move to…',de:'Verschieben nach…',fr:'Déplacer vers…',es:'Mover a…',it:'Sposta in…',cs:'Přesunout do…'},
    'Wszystkie nominały':{en:'All denominations',de:'Alle Nominale',fr:'Toutes les valeurs',es:'Todas las denominaciones',it:'Tutti i nominali',cs:'Všechny nominály'},
    'Wszystkie mennice':{en:'All mints',de:'Alle Münzstätten',fr:'Tous les ateliers',es:'Todas las cecas',it:'Tutte le zecche',cs:'Všechny mincovny'},
    'Wszystkie epoki':{en:'All periods',de:'Alle Epochen',fr:'Toutes les périodes',es:'Todas las épocas',it:'Tutte le epoche',cs:'Všechna období'},
    'Wszyscy władcy / emitenci':{en:'All rulers / issuers',de:'Alle Herrscher / Emittenten',fr:'Tous souverains / émetteurs',es:'Todos gobernantes / emisores',it:'Tutti sovrani / emittenti',cs:'Všichni panovníci / emitenti'},
    'Wróć':{en:'Back',de:'Zurück',fr:'Retour',es:'Volver',it:'Indietro',cs:'Zpět'},
    'Zapisz / drukuj PDF':{en:'Save / print PDF',de:'PDF speichern / drucken',fr:'Enregistrer / imprimer PDF',es:'Guardar / imprimir PDF',it:'Salva / stampa PDF',cs:'Uložit / tisknout PDF'},
    'Pobierz Excel (CSV)':{en:'Download Excel (CSV)',de:'Excel (CSV) herunterladen',fr:'Télécharger Excel (CSV)',es:'Descargar Excel (CSV)',it:'Scarica Excel (CSV)',cs:'Stáhnout Excel (CSV)'},
    'Wybrane monety':{en:'Selected coins',de:'Ausgewählte Münzen',fr:'Monnaies sélectionnées',es:'Monedas seleccionadas',it:'Monete selezionate',cs:'Vybrané mince'},
    'Eksport':{en:'Export',de:'Export',fr:'Export',es:'Exportar',it:'Esporta',cs:'Export'}
  };
  function current(){return localStorage.getItem(KEY)||'pl'}
  function tr(text,lang=current()){const x=T[text];return lang==='pl'||!x?text:(x[lang]||text)}
  function translateDOM(){const lang=current();document.documentElement.lang=lang;const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);nodes.forEach(n=>{if(n.parentElement&&['SCRIPT','STYLE','TEXTAREA','OPTION'].includes(n.parentElement.tagName))return;const raw=n.nodeValue,trim=raw.trim();if(!trim)return;if(!n.parentElement.dataset.i18nOriginal)n.parentElement.dataset.i18nOriginal=trim;const original=n.parentElement.dataset.i18nOriginal;if(T[original])n.nodeValue=raw.replace(trim,tr(original,lang))});document.querySelectorAll('input[placeholder]').forEach(el=>{if(!el.dataset.i18nPlaceholder)el.dataset.i18nPlaceholder=el.placeholder;el.placeholder=tr(el.dataset.i18nPlaceholder,lang)});document.querySelectorAll('option').forEach(el=>{if(!el.dataset.i18nOriginal)el.dataset.i18nOriginal=el.textContent.trim();el.textContent=tr(el.dataset.i18nOriginal,lang)});document.querySelectorAll('[data-i18n]').forEach(el=>{el.textContent=tr(el.dataset.i18n,lang)})}
  function mount(){if(document.getElementById('apomonetLang'))return;const box=document.createElement('div');box.id='apomonetLang';box.style.cssText='position:fixed;right:10px;top:10px;z-index:9999;background:#111;border:1px solid #3b3b3f;border-radius:12px;padding:5px 7px;box-shadow:0 4px 18px #0008';const sel=document.createElement('select');sel.setAttribute('aria-label','Language');sel.style.cssText='background:#111;color:#fff;border:0;font-size:12px;padding:5px;outline:none';Object.entries(langs).forEach(([k,v])=>sel.add(new Option(v,k)));sel.value=current();sel.onchange=()=>{localStorage.setItem(KEY,sel.value);location.reload()};box.appendChild(sel);document.body.appendChild(box);translateDOM()}
  return{langs,current,tr,translateDOM,mount};
})();
window.ApoI18n=ApoI18n;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>ApoI18n.mount());else ApoI18n.mount();

if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{}));