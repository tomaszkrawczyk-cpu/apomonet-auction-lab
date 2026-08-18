(()=>{
  const LANG_KEY='apomonet_language_v2';
  const JOB_KEY='apomonet_pending_analysis_v1';
  const PERF_KEY='apomonet_analysis_performance_v1';
  const lang=()=>localStorage.getItem(LANG_KEY)||'pl';
  const text={
    background:{pl:'Analiza została uruchomiona. Możesz zablokować ekran lub przejść do innej aplikacji — zdjęcia są zapisane, a po powrocie APOMONET dokończy lub wznowi analizę.',en:'Analysis has started. You may lock the screen or switch apps — the photos are saved and APOMONET will finish or resume when you return.',de:'Die Analyse wurde gestartet. Sie können den Bildschirm sperren oder die App wechseln — die Fotos sind gespeichert und APOMONET setzt die Analyse nach Ihrer Rückkehr fort.',fr:'L’analyse a démarré. Vous pouvez verrouiller l’écran ou changer d’application — les photos sont enregistrées et APOMONET reprendra à votre retour.'},
    resume:{pl:'Wznawiam przerwaną analizę…',en:'Resuming the interrupted analysis…',de:'Unterbrochene Analyse wird fortgesetzt…',fr:'Reprise de l’analyse interrompue…'},
    retry:{pl:'Połączenie zostało przerwane. Zdjęcia są bezpieczne — po powrocie do APOMONET analiza zostanie wznowiona automatycznie.',en:'The connection was interrupted. Your photos are safe — APOMONET will resume automatically when you return.',de:'Die Verbindung wurde unterbrochen. Ihre Fotos sind sicher — APOMONET setzt die Analyse nach Ihrer Rückkehr automatisch fort.',fr:'La connexion a été interrompue. Vos photos sont en sécurité — APOMONET reprendra automatiquement à votre retour.'},
    basicProgress:{pl:['Sprawdzam obie strony monety…','Ustalam emitenta, rok i nominał…','Kończę kartę podstawową…'],en:['Checking both sides of the coin…','Identifying issuer, year and denomination…','Finishing the basic card…'],de:['Beide Münzseiten werden geprüft…','Emittent, Jahr und Nennwert werden bestimmt…','Grundkarte wird fertiggestellt…'],fr:['Vérification des deux faces…','Identification de l’émetteur, de l’année et de la valeur…','Finalisation de la fiche initiale…']},
    detailProgress:{pl:['Odczytuję legendę i detale stempla…','Porównuję odmianę i znaki mennicze…','Kończę analizę szczegółową. Zdjęcia są bezpieczne…'],en:['Reading legends and die details…','Comparing the variety and mint marks…','Finishing detailed analysis. Your photos are safe…'],de:['Legenden und Stempeldetails werden gelesen…','Variante und Münzzeichen werden verglichen…','Detailanalyse wird abgeschlossen. Ihre Fotos sind sicher…'],fr:['Lecture des légendes et des détails du coin…','Comparaison de la variante et des marques d’atelier…','Finalisation de l’analyse détaillée. Vos photos sont en sécurité…']},
    basicDone:{pl:'Etap 1 gotowy.',en:'Stage 1 complete.',de:'Stufe 1 abgeschlossen.',fr:'Étape 1 terminée.'},
    deepDone:{pl:'Analiza szczegółowa zakończona.',en:'Detailed analysis complete.',de:'Detailanalyse abgeschlossen.',fr:'Analyse détaillée terminée.'},
    detailRecommended:{pl:'APOMONET nie jest całkowicie pewny wyniku.',en:'APOMONET is not fully certain about this result.',de:'APOMONET ist sich bei diesem Ergebnis nicht vollständig sicher.',fr:'APOMONET n’est pas totalement certain de ce résultat.'},
    detailRecommendedAction:{pl:'Uruchom analizę szczegółową lub dodaj wskazane zdjęcie.',en:'Run detailed analysis or add the requested photo.',de:'Starten Sie die Detailanalyse oder fügen Sie das angeforderte Foto hinzu.',fr:'Lancez l’analyse détaillée ou ajoutez la photo demandée.'},
    detailOptional:{pl:'Wynik podstawowy jest spójny.',en:'The basic result is consistent.',de:'Das Grundergebnis ist schlüssig.',fr:'Le résultat initial est cohérent.'},
    detailOptionalAction:{pl:'Analiza szczegółowa jest opcjonalna — uruchom ją, jeśli chcesz sprawdzić odmianę i stempel.',en:'Detailed analysis is optional — run it to examine the variety and die.',de:'Die Detailanalyse ist optional — starten Sie sie für Variante und Stempel.',fr:'L’analyse détaillée est facultative — lancez-la pour examiner la variante et le coin.'}
  };
  const msg=k=>text[k]?.[lang()]||text[k]?.pl||'';
  function loadPerf(){try{const rows=JSON.parse(localStorage.getItem(PERF_KEY)||'[]');return Array.isArray(rows)?rows:[]}catch{return[]}}
  function recordPerf(stage,startedAt,status,ok){const row={stage,durationMs:Math.max(0,Date.now()-startedAt),status:Number(status)||0,ok:!!ok,at:new Date().toISOString()},rows=loadPerf();rows.push(row);try{localStorage.setItem(PERF_KEY,JSON.stringify(rows.slice(-60)))}catch{}return row}
  function perfStats(stage){const values=loadPerf().filter(x=>x.ok&&(!stage||x.stage===stage)).map(x=>Number(x.durationMs)).filter(Number.isFinite).sort((a,b)=>a-b),pick=p=>values.length?values[Math.min(values.length-1,Math.max(0,Math.ceil(values.length*p)-1))]:0;return{stage:stage||'all',count:values.length,p50Ms:pick(.5),p90Ms:pick(.9)}}
  function doneWithTime(label,row){if(!row?.durationMs)return label;return `${label.replace(/\.$/,'')} • ${(row.durationMs/1000).toFixed(1).replace('.',',')} s.`}
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
  window.ApoAnalysisPerformance={load:loadPerf,record:recordPerf,stats:perfStats};

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
    'Etap 1 — szybka analiza':{en:'Stage 1 — quick analysis',de:'Stufe 1 — Schnellanalyse',fr:'Étape 1 — analyse rapide'},
    'Opis podstawowy':{en:'Basic description',de:'Grundbeschreibung',fr:'Description de base'},
    'Wstępne podsumowanie':{en:'Initial summary',de:'Erste Zusammenfassung',fr:'Résumé initial'},
    'Analizuj monetę':{en:'Analyze coin',de:'Münze analysieren',fr:'Analyser la monnaie'},
    'Czas analizy':{en:'Analysis time',de:'Analysezeit',fr:'Temps d’analyse'},
    'Wartość, katalog i dane dodatkowe':{en:'Value, catalogue and additional data',de:'Wert, Katalog und Zusatzdaten',fr:'Valeur, catalogue et données complémentaires'},
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

  const BASIC_CLIENT_TIMEOUT_MS=48_000;
  const DETAIL_CLIENT_TIMEOUT_MS=58_000;
  const MAX_ATTEMPTS=2;
  let activeJob=false,resumeTimer=0;
  function saveJob(job){try{localStorage.setItem(JOB_KEY,JSON.stringify(job))}catch{}}
  function loadJob(){try{return JSON.parse(localStorage.getItem(JOB_KEY)||'null')}catch{return null}}
  function clearJob(){try{localStorage.removeItem(JOB_KEY)}catch{}}
  const jid=()=>`analysis_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
  function requestError(payload,status){
    const error=new Error(apiError(payload,'Błąd serwera HTTP '+status));
    error.status=Number(status)||0;
    error.retryable=payload?.retryable===true||error.status===408||error.status===429||error.status>=500;
    return error;
  }
  async function fetchWithTimeout(url,options,timeoutMs){
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
    try{return await fetch(url,{...options,signal:controller.signal})}finally{clearTimeout(timer)}
  }
  function progress(stage,resumed){
    const status=$("status"),steps=text[stage==='detail'?'detailProgress':'basicProgress']?.[lang()]||text[stage==='detail'?'detailProgress':'basicProgress']?.pl||[];
    if(status)status.textContent=resumed?msg('resume'):msg('background');
    const delays=stage==='detail'?[8_000,20_000,35_000]:[5_000,13_000,27_000];
    const timers=steps.map((value,index)=>setTimeout(()=>{if(status)status.textContent=value},delays[index]));
    return()=>timers.forEach(clearTimeout);
  }
  function seconds(ms){return (Number(ms||0)/1000).toFixed(1).replace('.',',')+' s'}
  function showTiming(stage,row){
    const box=$("analysisTiming"),out=$("analysisTimingText");if(!box||!out||!row)return;
    const stats=perfStats(stage),label=stage==='detail'?'Etap 2':'Etap 1';
    out.textContent=stats.count>=3?`${label}: ta próba ${seconds(row.durationMs)} • p50 ${seconds(stats.p50Ms)} • p90 ${seconds(stats.p90Ms)} (${stats.count} prób)`:`${label}: ${seconds(row.durationMs)} • zbieram serię do p50/p90 (${stats.count}/3)`;
    box.classList.remove('hidden');
  }
  function detailSignals(analysis,extra=[]){
    const reasons=[...(analysis?.uncertaintyReasons||[]),...extra].filter(Boolean);
    const missing=['country','ruler','year','nominal'].filter(k=>{const value=String(analysis?.[k]||'').trim().toLowerCase();return !value||value==='nie ustalono'||value.includes('do potwierdzenia')});
    if(missing.length)reasons.push('Brakuje pewnej podstawowej identyfikacji.');
    if(Number(analysis?.confidence||0)<85)reasons.push('Ogólna pewność wyniku jest obniżona.');
    if([analysis?.rulerConfidence,analysis?.yearConfidence,analysis?.nominalConfidence].some(v=>Number(v||0)<80))reasons.push('Co najmniej jedno kluczowe pole wymaga kontroli.');
    const qualityNote=String(analysis?.imageQualityNote||'');
    if(/słab|nieost|rozmy|ciem|odblask|uci[eę]t|nieczytel|low quality|blur|glare/i.test(qualityNote))reasons.push(qualityNote);
    try{if(photoDiagnostics?.some(x=>x&&x.quality!=='good'))reasons.push('Jakość przynajmniej jednego zdjęcia jest ograniczona.')}catch{}
    const warnings=Array.isArray(analysis?.warnings)?analysis.warnings.filter(Boolean):[];
    if(warnings.length)reasons.push(warnings[0]);
    return[...new Set(reasons)].slice(0,3);
  }
  function recommendDetail(analysis,extra=[]){
    const box=$("deepRecommendation"),deep=$("deep");if(!box||!deep||!analysis)return;
    const reasons=detailSignals(analysis,extra),recommended=Boolean(analysis.needsDetailedAnalysis||analysis.detailRecommended||reasons.length);
    box.replaceChildren();
    const strong=document.createElement('strong'),description=document.createElement('span');
    if(recommended){
      const badge=document.createElement('span');badge.className='recommendation-badge';badge.textContent='ZALECANA';box.appendChild(badge);
      strong.textContent=msg('detailRecommended');description.textContent=msg('detailRecommendedAction')+(reasons.length?' '+reasons.join(' '):'');
      box.classList.add('attention');deep.classList.add('recommended');
    }else{
      strong.textContent=msg('detailOptional');description.textContent=msg('detailOptionalAction');
      box.classList.remove('attention');deep.classList.remove('recommended');
    }
    box.append(strong,description);box.classList.remove('hidden');
    deep.setAttribute('aria-describedby','deepRecommendation');
  }
  window.ApoTwoStage={recommend:recommendDetail,signals:detailSignals};
  function compactSupplementals(){
    if(!location.pathname.endsWith('analyze.html'))return;
    const ids=['apomonetValuation','apomonetFollowUps','catalogCheck','catalogRarity','auctionMarketFacts','marketValuation','ownerMeasurementsBox'];
    const nodes=ids.map(id=>$(id)).filter(Boolean);if(!nodes.length)return;
    let details=$('analysisSupplement'),content=$('analysisSupplementContent');
    if(!details){
      details=document.createElement('details');details.id='analysisSupplement';details.className='detail';
      const summary=document.createElement('summary');summary.textContent='Wartość, katalog i dane dodatkowe';summary.style.cursor='pointer';summary.style.fontWeight='800';
      content=document.createElement('div');content.id='analysisSupplementContent';content.style.marginTop='10px';
      details.append(summary,content);const anchor=$('deepRecommendation')||$('panel')?.querySelector('.section-title:last-of-type');anchor?.before(details);
    }
    for(const node of nodes)if(node.parentElement!==content)content.appendChild(node);
  }
  function finishStatus(stage,row){
    const label=stage==='detail'?msg('deepDone'):msg('basicDone');
    $("status").textContent=doneWithTime(label,row);showTiming(stage,row);
  }
  function keepForRetry(running,error,stage){
    const retryable=error?.retryable===true||error?.name==='AbortError';
    if(!retryable){clearJob();$("status").textContent=error?.message||'Nie udało się ukończyć analizy.';return}
    saveJob({...running,status:'waiting',resumed:true,lastError:String(error?.message||error),requestStartedAt:0});
    $("status").textContent=error?.name==='AbortError'?(stage==='detail'?'Analiza szczegółowa przekroczyła limit czasu. Zdjęcia są bezpieczne — możesz spróbować ponownie.':'Analiza wstępna przekroczyła limit czasu. Zdjęcia są bezpieczne — spróbuję ponownie po powrocie.'):msg('retry');
  }
  async function basic(job){
    if(activeJob)return;
    const requestStartedAt=Date.now(),running={...job,status:'running',attempts:Number(job.attempts||0)+1,requestStartedAt};
    let perfRow=null;activeJob=true;saveJob(running);const stopProgress=progress('basic',running.resumed);
    try{
      $("go").disabled=true;
      const r=await fetchWithTimeout('/api/analyze',{method:'POST',headers:{'Content-Type':'application/json','X-Apo-Job-Id':running.id},body:JSON.stringify({images:running.analysisImgs,mode:'basic',jobId:running.id})},BASIC_CLIENT_TIMEOUT_MS);
      perfRow=recordPerf('basic',requestStartedAt,r.status,r.ok);let d;try{d=await r.json()}catch{throw Error('Serwer nie zwrócił poprawnej odpowiedzi.')}
      if(!r.ok)throw requestError(d,r.status);
      a=d.analysis;localizedA=null;render();recommendDetail(a);compactSupplementals();try{persistAnalysisSession()}catch{}
      dispatchEvent(new CustomEvent('apomonet:analysis-ready',{detail:{stage:'basic',analysis:a,meta:d.meta||{}}}));
      finishStatus('basic',perfRow);clearJob();
      void localizeCurrent({scroll:false}).then(ok=>{if(ok)recommendDetail(a)});
    }catch(error){if(!perfRow)recordPerf('basic',requestStartedAt,0,false);console.error('[analysis-job]',error);keepForRetry(running,error,'basic')}
    finally{stopProgress();activeJob=false;$("go").disabled=!ready()}
  }
  async function deepJob(job){
    if(activeJob)return;
    const requestStartedAt=Date.now(),running={...job,status:'running',attempts:Number(job.attempts||0)+1,requestStartedAt};
    let perfRow=null;activeJob=true;saveJob(running);const stopProgress=progress('detail',running.resumed);
    try{
      $("deep").disabled=true;$("deep").setAttribute('aria-busy','true');
      const r=await fetchWithTimeout('/api/analyze-detail',{method:'POST',headers:{'Content-Type':'application/json','X-Apo-Job-Id':running.id},body:JSON.stringify({images:running.analysisImgs,base:running.base,jobId:running.id})},DETAIL_CLIENT_TIMEOUT_MS);
      perfRow=recordPerf('detail',requestStartedAt,r.status,r.ok);let d;try{d=await r.json()}catch{throw Error('Serwer nie zwrócił poprawnej odpowiedzi.')}
      if(!r.ok)throw requestError(d,r.status);
      a={...(a||running.base||{}),...d.detail,detail:d.detail,analysisLevel:'detailed'};localizedA=null;$("deepConf").textContent=`Pewność ${d.detail.confidence||0}%`;renderDetail(d.detail);$("deepPanel").classList.remove('hidden');compactSupplementals();try{persistAnalysisSession()}catch{}
      dispatchEvent(new CustomEvent('apomonet:analysis-ready',{detail:{stage:'detail',analysis:a,meta:d.meta||{}}}));
      finishStatus('detail',perfRow);clearJob();$("deepRecommendation")?.classList.add('hidden');$("deep")?.classList.remove('recommended');
      void localizeCurrent({scroll:false,showDetail:true});
    }catch(error){if(!perfRow)recordPerf('detail',requestStartedAt,0,false);console.error('[detail-job]',error);keepForRetry(running,error,'detail')}
    finally{stopProgress();activeJob=false;$("deep").disabled=false;$("deep").removeAttribute('aria-busy')}
  }
  function patchAnalysis(){
    if(!location.pathname.endsWith('analyze.html')||typeof $!=='function')return;
    const go=$("go"),deep=$("deep");
    if(go)go.onclick=()=>{if(!ready()||activeJob)return;const job={id:jid(),mode:'basic',analysisImgs:[...analysisImgs],displayImgs:[...imgs],startedAt:Date.now(),attempts:0};saveJob(job);void basic(job)};
    if(deep)deep.onclick=()=>{if(!a||activeJob)return;const job={id:jid(),mode:'detail',analysisImgs:[...analysisImgs],displayImgs:[...imgs],base:detailBase(),startedAt:Date.now(),attempts:0};saveJob(job);void deepJob(job)};
    const pending=loadJob();if(pending?.displayImgs?.length){
      if(!imgs[0]&&pending.displayImgs[0]){imgs[0]=pending.displayImgs[0];analysisImgs[0]=pending.analysisImgs?.[0]||pending.displayImgs[0];preview(imgs[0],'oi','op')}
      if(!imgs[1]&&pending.displayImgs[1]){imgs[1]=pending.displayImgs[1];analysisImgs[1]=pending.analysisImgs?.[1]||pending.displayImgs[1];preview(imgs[1],'ri','rp')}
      ready();$("status").textContent=msg('retry');
    }
    if(a)recommendDetail(a);
    const resume=()=>{
      if(activeJob||document.hidden||navigator.onLine===false)return;
      const job=loadJob();if(!job||!['waiting','running'].includes(job.status)||Number(job.attempts||0)>=MAX_ATTEMPTS)return;
      const limit=job.mode==='detail'?DETAIL_CLIENT_TIMEOUT_MS:BASIC_CLIENT_TIMEOUT_MS,age=Date.now()-Number(job.requestStartedAt||job.startedAt||0),remaining=limit+5_000-age;
      if(job.status==='running'&&remaining>0){clearTimeout(resumeTimer);resumeTimer=setTimeout(resume,remaining);return}
      job.resumed=true;job.status='waiting';job.mode==='detail'?void deepJob(job):void basic(job);
    };
    addEventListener('apomonet:reference-conflict',event=>recommendDetail(a,event.detail?.reasons||['Źródło referencyjne wykryło konflikt identyfikacji.']));
    document.addEventListener('visibilitychange',resume);window.addEventListener('online',resume);setTimeout(resume,700);
  }
  function init(){wrapStorage();polishAuctionHouse();lateTranslate();patchAnalysis();compactSupplementals();const obs=new MutationObserver(()=>{lateTranslate();compactSupplementals()});if(document.body)obs.observe(document.body,{childList:true,subtree:true});addEventListener('apomonet:language-change',()=>setTimeout(()=>{polishAuctionHouse();lateTranslate();compactSupplementals()},0))}
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init):init();
})();
