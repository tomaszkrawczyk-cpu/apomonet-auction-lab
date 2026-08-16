(()=>{
  const LANG_KEY='apomonet_language_v2';
  const JOB_KEY='apomonet_pending_analysis_v1';
  const lang=()=>localStorage.getItem(LANG_KEY)||'pl';
  const text={
    background:{pl:'Analiza została uruchomiona. Możesz zablokować ekran lub przejść do innej aplikacji — zdjęcia są zapisane, a po powrocie APOMONET dokończy lub wznowi analizę.',en:'Analysis has started. You may lock the screen or switch apps — the photos are saved and APOMONET will finish or resume when you return.',de:'Die Analyse wurde gestartet. Sie können den Bildschirm sperren oder die App wechseln — die Fotos sind gespeichert und APOMONET setzt die Analyse nach Ihrer Rückkehr fort.',fr:'L’analyse a démarré. Vous pouvez verrouiller l’écran ou changer d’application — les photos sont enregistrées et APOMONET reprendra à votre retour.'},
    resume:{pl:'Wznawiam przerwaną analizę…',en:'Resuming the interrupted analysis…',de:'Unterbrochene Analyse wird fortgesetzt…',fr:'Reprise de l’analyse interrompue…'},
    retry:{pl:'Połączenie zostało przerwane. Zdjęcia są bezpieczne — po powrocie do APOMONET analiza zostanie wznowiona automatycznie.',en:'The connection was interrupted. Your photos are safe — APOMONET will resume automatically when you return.',de:'Die Verbindung wurde unterbrochen. Ihre Fotos sind sicher — APOMONET setzt die Analyse nach Ihrer Rückkehr automatisch fort.',fr:'La connexion a été interrompue. Vos photos sont en sécurité — APOMONET reprendra automatiquement à votre retour.'},
    basicDone:{pl:'Etap 1 gotowy.',en:'Stage 1 complete.',de:'Stufe 1 abgeschlossen.',fr:'Étape 1 terminée.'},
    deepDone:{pl:'Analiza szczegółowa zakończona.',en:'Detailed analysis complete.',de:'Detailanalyse abgeschlossen.',fr:'Analyse détaillée terminée.'}
  };
  const msg=k=>text[k]?.[lang()]||text[k]?.pl||'';
  function normalizeRuler(value){
    const v=String(value||'').trim();
    if(/^Jan\s+II\s+Kazimierz(?:\s+Waza)?$/i.test(v))return 'Jan II Kazimierz';
    return value;
  }
  function catalogFor(base,detail){
    const ruler=normalizeRuler(base?.ruler||detail?.ruler||'');
    const year=String(base?.year||detail?.year||'');
    const nominal=String(base?.nominal||detail?.nominal||'');
    const mint=String(base?.mint||detail?.mint||'');
    const diagnostic=[detail?.variant,detail?.reverseDetails,detail?.obverseDetails,detail?.legendPunctuation,detail?.fullDescription,...(detail?.diagnosticFeatures||[])].join(' ');
    if(!/^Jan II Kazimierz$/i.test(String(ruler))||!/^1649$/.test(year.trim())||!/talar|thaler/i.test(nominal)||!/toru[nń]|thorn/i.test(mint))return null;
    if(/\bHD\s*[-–]?\s*L\b|\bHDL\b/i.test(diagnostic))return{reference:'Kopicki 8339',rarity:'R5',verifiedBasis:'1649 Toruń HDL'};
    if(/bez inicjał|without initials|ohne initial|\bG\s*[-–]?\s*R\b/i.test(diagnostic))return{reference:'Kopicki 8337',rarity:'R4',verifiedBasis:'1649 Toruń early type'};
    return null;
  }
  window.ApoPretester={normalizeRuler,catalogFor};

  const nativeFetch=window.fetch.bind(window);
  window.fetch=async function(input,init){
    const url=typeof input==='string'?input:(input?.url||'');
    const response=await nativeFetch(input,init);
    if(!response.ok||(!url.includes('/api/analyze')&&!url.includes('/api/analyze-detail')))return response;
    try{
      const data=await response.clone().json();
      if(data?.analysis?.ruler)data.analysis.ruler=normalizeRuler(data.analysis.ruler);
      if(data?.detail){
        if(data.detail.ruler)data.detail.ruler=normalizeRuler(data.detail.ruler);
        let body={};try{body=JSON.parse(init?.body||'{}')}catch{}
        const hit=catalogFor(body.base||{},data.detail);
        if(hit){
          data.detail.kopickiReference=hit.reference;
          data.detail.kopickiRarity=hit.rarity;
          if(!data.detail.rarity)data.detail.rarity=hit.rarity;
          data.detail.catalogVerification='verified-curated';
        }
      }
      const headers=new Headers(response.headers);headers.set('content-type','application/json; charset=utf-8');
      return new Response(JSON.stringify(data),{status:response.status,statusText:response.statusText,headers});
    }catch{return response}
  };

  function wrapStorage(){
    if(!window.ApoMonet||ApoMonet.__pretesterNormalized)return;
    const old=ApoMonet.upsertCoin.bind(ApoMonet);
    ApoMonet.upsertCoin=(coin)=>old({...coin,ruler:normalizeRuler(coin?.ruler)});
    ApoMonet.__pretesterNormalized=true;
    try{
      const state=ApoMonet.load(),changed=state.coins.some(c=>normalizeRuler(c.ruler)!==c.ruler);
      if(changed){state.coins=state.coins.map(c=>({...c,ruler:normalizeRuler(c.ruler)}));ApoMonet.save(state)}
    }catch{}
  }

  const UI={
    'Edytuj i popraw':{en:'Edit and correct',de:'Bearbeiten und korrigieren',fr:'Modifier et corriger'},
    'Do kolekcji':{en:'Go to collection',de:'Zur Sammlung',fr:'Vers la collection'},
    'Analizuj inną monetę':{en:'Analyze another coin',de:'Andere Münze analysieren',fr:'Analyser une autre monnaie'},
    'Usuń monetę z kolekcji':{en:'Delete coin from collection',de:'Münze aus Sammlung löschen',fr:'Supprimer de la collection'},
    'Profil domu aukcyjnego':{en:'Auction house profile',de:'Auktionshaus-Profil',fr:'Profil de la maison de vente'},
    'Aktualne aukcje':{en:'Current auctions',de:'Aktuelle Auktionen',fr:'Enchères en cours'},
    'Archiwum wyników':{en:'Results archive',de:'Ergebnisarchiv',fr:'Archives des résultats'},
    'Kontakt i linki':{en:'Contact and links',de:'Kontakt und Links',fr:'Contact et liens'},
    'Otwórz aukcje':{en:'Open auctions',de:'Auktionen öffnen',fr:'Ouvrir les enchères'},
    'Przejdź do strony':{en:'Open official website',de:'Offizielle Website öffnen',fr:'Ouvrir le site officiel'},
    'Strona WWW':{en:'Official website',de:'Offizielle Website',fr:'Site officiel'},
    'Etap 1 — identyfikacja podstawowa':{en:'Stage 1 — basic identification',de:'Stufe 1 — Grundbestimmung',fr:'Étape 1 — identification de base'},
    'Opis podstawowy':{en:'Basic description',de:'Grundbeschreibung',fr:'Description de base'},
    'Co dalej?':{en:'What next?',de:'Wie weiter?',fr:'Et ensuite ?'},
    'Najpierw popraw dane':{en:'Correct data first',de:'Daten zuerst korrigieren',fr:'Corriger les données'},
    'Zapisz do kolekcji':{en:'Save to collection',de:'In Sammlung speichern',fr:'Enregistrer dans la collection'},
    'Zapisz i wybierz album':{en:'Save and choose album',de:'Speichern und Album wählen',fr:'Enregistrer et choisir un album'},
    'Analiza szczegółowa':{en:'Detailed analysis',de:'Detailanalyse',fr:'Analyse détaillée'},
    'Etap 2 — analiza szczegółowa':{en:'Stage 2 — detailed analysis',de:'Stufe 2 — Detailanalyse',fr:'Étape 2 — analyse détaillée'}
  };
  const originals=new WeakMap();
  function lateTranslate(root=document.body){
    const l=lang();if(l==='pl'||!root)return;
    const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let n;
    while(n=w.nextNode()){
      if(!n.parentElement||['SCRIPT','STYLE'].includes(n.parentElement.tagName))continue;
      const raw=n.nodeValue,trim=raw.trim();if(!trim)continue;
      if(!originals.has(n))originals.set(n,trim);
      const src=originals.get(n),dst=UI[src]?.[l];
      if(dst)n.nodeValue=raw.replace(trim,dst);
    }
  }

  function polishAuctionHouse(){
    if(!location.pathname.endsWith('auction-house.html'))return;
    const id=new URLSearchParams(location.search).get('id');if(id!=='stary-sklep')return;
    const l=lang();
    const C={
      pl:{ey:'DOM AUKCYJNY',desc:'Polski dom aukcyjny specjalizujący się w numizmatyce. APOMONET pokazuje najważniejsze informacje w czystej karcie, a licytacja odbywa się na oficjalnej stronie.',current:'Aktualne aukcje',currentP:'Sprawdź bieżące i zapowiedziane aukcje Starego Sklepu na oficjalnej platformie.',open:'Zobacz aktualne aukcje',archive:'Archiwum wyników',archiveP:'Przejdź do oficjalnej strony domu aukcyjnego, aby sprawdzić zakończone aukcje i wyniki.',site:'Otwórz oficjalną stronę',contact:'Kontakt',note:'Linki zewnętrzne otwierają oficjalne serwisy. APOMONET nie osadza całych stron aukcyjnych.'},
      en:{ey:'AUCTION HOUSE',desc:'Polish numismatic auction house. APOMONET presents the key information in a clean card while bidding takes place on the official website.',current:'Current auctions',currentP:'Check current and upcoming Stary Sklep auctions on the official platform.',open:'View current auctions',archive:'Results archive',archiveP:'Open the official auction-house website to check completed auctions and results.',site:'Open official website',contact:'Contact',note:'External links open official services. APOMONET does not embed entire auction websites.'},
      de:{ey:'AUKTIONSHAUS',desc:'Polnisches Numismatik-Auktionshaus. APOMONET zeigt die wichtigsten Informationen übersichtlich; geboten wird auf der offiziellen Website.',current:'Aktuelle Auktionen',currentP:'Aktuelle und kommende Auktionen von Stary Sklep auf der offiziellen Plattform ansehen.',open:'Aktuelle Auktionen ansehen',archive:'Ergebnisarchiv',archiveP:'Auf der offiziellen Website finden Sie abgeschlossene Auktionen und Ergebnisse.',site:'Offizielle Website öffnen',contact:'Kontakt',note:'Externe Links öffnen offizielle Dienste. APOMONET bettet keine vollständigen Auktionsseiten ein.'},
      fr:{ey:'MAISON DE VENTE',desc:'Maison de vente polonaise spécialisée en numismatique. APOMONET présente les informations essentielles dans une carte claire; les enchères ont lieu sur le site officiel.',current:'Enchères en cours',currentP:'Consultez les ventes actuelles et à venir de Stary Sklep sur la plateforme officielle.',open:'Voir les enchères',archive:'Archives des résultats',archiveP:'Consultez le site officiel pour les ventes terminées et leurs résultats.',site:'Ouvrir le site officiel',contact:'Contact',note:'Les liens externes ouvrent les services officiels. APOMONET n’intègre pas les pages complètes des plateformes.'}
    }[l]||null;if(!C)return;
    const hero=document.querySelector('.hero.compact');if(hero)hero.innerHTML=`<span class="eyebrow">${C.ey}</span><h1>Stary Sklep — Sylwester Kopyciński</h1><p>${C.desc}</p>`;
    const grid=document.querySelector('.grid');if(grid)grid.innerHTML=`<div class="card auction-clean"><div class="auction-mark">SS</div><h3>${C.current}</h3><p>${C.currentP}</p><a class="btn primary" href="https://onebid.pl/pl/auctionslist/Stary-Sklep" target="_blank" rel="noopener">${C.open}</a></div><div class="card"><h3>${C.archive}</h3><p>${C.archiveP}</p><a class="btn secondary" href="https://starysklep.onebid.pl/pl/index" target="_blank" rel="noopener">${C.site}</a></div><div class="card"><h3>${C.contact}</h3><p>+48 513 508 430<br>stary-sklep@wp.pl</p><a class="btn secondary" href="https://starysklep.onebid.pl/pl/index" target="_blank" rel="noopener">${C.site}</a></div><div class="card"><p class="muted">${C.note}</p></div>`;
    if(!document.getElementById('auctionCleanStyle')){const s=document.createElement('style');s.id='auctionCleanStyle';s.textContent='.auction-clean{position:relative;overflow:hidden}.auction-mark{width:54px;height:54px;border-radius:14px;display:grid;place-items:center;background:#211406;border:1px solid #6b4814;color:#e09a2d;font-weight:900;font-size:20px;margin-bottom:14px}';document.head.appendChild(s)}
  }

  let activeJob=false;
  function saveJob(job){try{localStorage.setItem(JOB_KEY,JSON.stringify(job))}catch{}}
  function loadJob(){try{return JSON.parse(localStorage.getItem(JOB_KEY)||'null')}catch{return null}}
  function clearJob(){try{localStorage.removeItem(JOB_KEY)}catch{}}
  const jid=()=>`analysis_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
  async function basic(job){
    const running={...job,status:'running',attempts:Number(job.attempts||0)+1};
    activeJob=true;saveJob(running);
    try{
      $("go").disabled=true;$("status").textContent=running.resumed?msg('resume'):msg('background');
      const r=await fetch('/api/analyze',{method:'POST',headers:{'Content-Type':'application/json','X-Apo-Job-Id':running.id},body:JSON.stringify({images:running.analysisImgs,mode:'basic',jobId:running.id})});
      let d;try{d=await r.json()}catch{throw Error('Serwer nie zwrócił poprawnej odpowiedzi.')}
      if(!r.ok)throw Error(apiError(d,'Błąd serwera HTTP '+r.status));
      a=d.analysis;localizedA=null;render();const translated=await localizeCurrent({scroll:false});if(translated)$("status").textContent=msg('basicDone');clearJob();
    }catch(e){console.error('[analysis-job]',e);saveJob({...running,status:'waiting',resumed:true,lastError:String(e?.message||e)});$("status").textContent=msg('retry')}
    finally{activeJob=false;$("go").disabled=false}
  }
  async function deepJob(job){
    const running={...job,status:'running',attempts:Number(job.attempts||0)+1};
    activeJob=true;saveJob(running);
    try{
      $("deep").disabled=true;$("deep").setAttribute('aria-busy','true');$("status").textContent=running.resumed?msg('resume'):msg('background');
      const r=await fetch('/api/analyze-detail',{method:'POST',headers:{'Content-Type':'application/json','X-Apo-Job-Id':running.id},body:JSON.stringify({images:running.analysisImgs,base:running.base,jobId:running.id})});
      let d;try{d=await r.json()}catch{throw Error('Serwer nie zwrócił poprawnej odpowiedzi.')}
      if(!r.ok)throw Error(apiError(d,'Błąd serwera HTTP '+r.status));
      a={...(a||running.base||{}),...d.detail,detail:d.detail};localizedA=null;$("deepConf").textContent=`Pewność ${d.detail.confidence||0}%`;renderDetail(d.detail);$("deepPanel").classList.remove('hidden');const translated=await localizeCurrent({scroll:false,showDetail:true});if(translated)$("status").textContent=msg('deepDone');clearJob();
    }catch(e){console.error('[detail-job]',e);saveJob({...running,status:'waiting',resumed:true,lastError:String(e?.message||e)});$("status").textContent=msg('retry')}
    finally{activeJob=false;$("deep").disabled=false;$("deep").removeAttribute('aria-busy')}
  }
  function patchAnalysis(){
    if(!location.pathname.endsWith('analyze.html')||typeof $!=='function')return;
    const go=$("go"),deep=$("deep");
    if(go)go.onclick=()=>{if(!ready())return;const job={id:jid(),mode:'basic',analysisImgs:[...analysisImgs],displayImgs:[...imgs],startedAt:Date.now(),attempts:0};saveJob(job);void basic(job)};
    if(deep)deep.onclick=()=>{if(!a)return;const job={id:jid(),mode:'detail',analysisImgs:[...analysisImgs],displayImgs:[...imgs],base:detailBase(),startedAt:Date.now(),attempts:0};saveJob(job);void deepJob(job)};
    const pending=loadJob();if(pending?.displayImgs?.length){
      if(!imgs[0]&&pending.displayImgs[0]){imgs[0]=pending.displayImgs[0];analysisImgs[0]=pending.analysisImgs?.[0]||pending.displayImgs[0];preview(imgs[0],'oi','op')}
      if(!imgs[1]&&pending.displayImgs[1]){imgs[1]=pending.displayImgs[1];analysisImgs[1]=pending.analysisImgs?.[1]||pending.displayImgs[1];preview(imgs[1],'ri','rp')}
      ready();$("status").textContent=msg('retry');
    }
    const resume=()=>{if(activeJob||document.hidden||navigator.onLine===false)return;const j=loadJob();if(!j||!['waiting','running'].includes(j.status)||Number(j.attempts||0)>=3)return;j.resumed=true;j.status='waiting';j.mode==='detail'?void deepJob(j):void basic(j)};
    document.addEventListener('visibilitychange',resume);window.addEventListener('online',resume);setTimeout(resume,700);
  }
  function init(){wrapStorage();polishAuctionHouse();lateTranslate();patchAnalysis();const obs=new MutationObserver(()=>lateTranslate());if(document.body)obs.observe(document.body,{childList:true,subtree:true});addEventListener('apomonet:language-change',()=>setTimeout(()=>{polishAuctionHouse();lateTranslate()},0))}
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init):init();
})();
