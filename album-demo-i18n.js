(()=>{
  if(!location.pathname.endsWith('album.html'))return;
  const LANG_KEY='apomonet_language_v2';
  const dictionaries={
    de:{
      '✓ MOJE':'✓ MEINE SAMMLUNG','◎ CELE':'◎ ZIELE','✦ MARZENIA':'✦ TRAUMMÜNZEN',
      'Moja kolekcja':'Meine Sammlung','Cele kolekcjonerskie':'Sammlungsziele','Monety marzeń':'Traummünzen',
      'Monety, które już znajdują się w kolekcji.':'Münzen, die sich bereits in meiner Sammlung befinden.',
      'Monety, których aktywnie szukam.':'Münzen, nach denen ich aktiv suche.',
      'Rzadkie lub wyjątkowe monety, które chcę kiedyś zdobyć.':'Seltene oder besondere Münzen, die ich eines Tages erwerben möchte.',
      'Wszyscy władcy / emitenci':'Alle Herrscher / Emittenten','Wszystkie nominały':'Alle Nominale','Wszystkie mennice':'Alle Münzstätten','Wszystkie epoki':'Alle Epochen',
      'Lista':'Liste','Małe kafelki':'Kleine Kacheln','Duże kafelki':'Große Kacheln','Wyczyść filtry':'Filter löschen','Przywróć układ demo':'Demo-Anordnung wiederherstellen',
      'Zaznacz wszystko':'Alle auswählen','Odznacz wszystko':'Auswahl aufheben','PDF z wybranych':'PDF aus Auswahl','Udostępnij wybrane':'Auswahl teilen',
      'PRZYKŁAD':'BEISPIEL','Przenieś do…':'Verschieben nach…','Sprawdź aukcje':'Auktionen prüfen',
      'Denar wczesnopiastowski':'Frühpiastischer Denar','Denar Mieszka':'Denar von Mieszko','Denar Bolesława Chrobrego':'Denar von Bolesław Chrobry',
      'Mieszko I / wczesni Piastowie':'Mieszko I. / frühe Piasten','Bolesław I Chrobry':'Bolesław I. Chrobry','II Rzeczpospolita':'Zweite Polnische Republik',
      'Wolne Miasto Gdańsk':'Freie Stadt Danzig','Pierwsi Piastowie':'Frühe Piasten','Warszawa':'Warschau','Polska':'Polen','Srebro':'Silber','Brąz':'Bronze',
      '10 złotych':'10 Złoty','10 złotych PRÓBA':'10 Złoty PROBE','PRÓBA 10 złotych Polonia':'PROBE 10 Złoty Polonia',
      '1 gulden Wolnego Miasta Gdańska':'1 Gulden der Freien Stadt Danzig'
    },
    en:{
      '✓ MOJE':'✓ MINE','◎ CELE':'◎ TARGETS','✦ MARZENIA':'✦ DREAM COINS','Moja kolekcja':'My collection','Cele kolekcjonerskie':'Collecting targets','Monety marzeń':'Dream coins',
      'Monety, które już znajdują się w kolekcji.':'Coins already in my collection.','Monety, których aktywnie szukam.':'Coins I am actively looking for.','Rzadkie lub wyjątkowe monety, które chcę kiedyś zdobyć.':'Rare or exceptional coins I would like to acquire one day.',
      'Wszyscy władcy / emitenci':'All rulers / issuers','Wszystkie nominały':'All denominations','Wszystkie mennice':'All mints','Wszystkie epoki':'All periods','Lista':'List','Małe kafelki':'Small tiles','Duże kafelki':'Large tiles','Wyczyść filtry':'Clear filters','Przywróć układ demo':'Restore demo layout','Zaznacz wszystko':'Select all','Odznacz wszystko':'Deselect all','PDF z wybranych':'PDF from selected','Udostępnij wybrane':'Share selected','PRZYKŁAD':'EXAMPLE','Przenieś do…':'Move to…','Sprawdź aukcje':'Check auctions',
      'Denar wczesnopiastowski':'Early Piast denar','Denar Mieszka':'Mieszko denar','Denar Bolesława Chrobrego':'Bolesław Chrobry denar','Mieszko I / wczesni Piastowie':'Mieszko I / early Piasts','Bolesław I Chrobry':'Bolesław I the Brave','II Rzeczpospolita':'Second Polish Republic','Wolne Miasto Gdańsk':'Free City of Danzig','Pierwsi Piastowie':'Early Piasts','Warszawa':'Warsaw','Polska':'Poland','Srebro':'Silver','Brąz':'Bronze','10 złotych PRÓBA':'10 złoty TRIAL','PRÓBA 10 złotych Polonia':'TRIAL 10 złoty Polonia','1 gulden Wolnego Miasta Gdańska':'1 gulden Free City of Danzig'
    },
    fr:{
      '✓ MOJE':'✓ MA COLLECTION','◎ CELE':'◎ OBJECTIFS','✦ MARZENIA':'✦ MONNAIES DE RÊVE','Moja kolekcja':'Ma collection','Cele kolekcjonerskie':'Objectifs de collection','Monety marzeń':'Monnaies de rêve',
      'Monety, które już znajdują się w kolekcji.':'Monnaies déjà présentes dans ma collection.','Monety, których aktywnie szukam.':'Monnaies que je recherche activement.','Rzadkie lub wyjątkowe monety, które chcę kiedyś zdobyć.':'Monnaies rares ou exceptionnelles que je souhaite acquérir un jour.',
      'Wszyscy władcy / emitenci':'Tous les souverains / émetteurs','Wszystkie nominały':'Toutes les valeurs','Wszystkie mennice':'Tous les ateliers','Wszystkie epoki':'Toutes les périodes','Lista':'Liste','Małe kafelki':'Petites vignettes','Duże kafelki':'Grandes vignettes','Wyczyść filtry':'Effacer les filtres','Przywróć układ demo':'Restaurer la démo','Zaznacz wszystko':'Tout sélectionner','Odznacz wszystko':'Tout désélectionner','PDF z wybranych':'PDF de la sélection','Udostępnij wybrane':'Partager la sélection','PRZYKŁAD':'EXEMPLE','Przenieś do…':'Déplacer vers…','Sprawdź aukcje':'Voir les enchères',
      'Denar wczesnopiastowski':'Denier des premiers Piast','Denar Mieszka':'Denier de Mieszko','Denar Bolesława Chrobrego':'Denier de Bolesław Chrobry','Mieszko I / wczesni Piastowie':'Mieszko Ier / premiers Piast','Bolesław I Chrobry':'Bolesław Ier le Vaillant','II Rzeczpospolita':'Deuxième République de Pologne','Wolne Miasto Gdańsk':'Ville libre de Dantzig','Pierwsi Piastowie':'Premiers Piast','Warszawa':'Varsovie','Polska':'Pologne','Srebro':'Argent','Brąz':'Bronze','10 złotych PRÓBA':'10 złotych ESSAI','PRÓBA 10 złotych Polonia':'ESSAI 10 złotych Polonia','1 gulden Wolnego Miasta Gdańska':'1 gulden de la Ville libre de Dantzig'
    }
  };
  const originals=new WeakMap();
  function lang(){return localStorage.getItem(LANG_KEY)||'pl'}
  function translateText(text,l){return dictionaries[l]?.[text]||text}
  function walk(){
    const l=lang();if(l==='pl')return;
    const dict=dictionaries[l]||{};
    const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n;
    while(n=walker.nextNode()){
      if(!n.parentElement||['SCRIPT','STYLE'].includes(n.parentElement.tagName))continue;
      const raw=n.nodeValue,trim=raw.trim();if(!trim)continue;
      if(!originals.has(n))originals.set(n,trim);
      const src=originals.get(n),dst=dict[src];
      if(dst)n.nodeValue=raw.replace(trim,dst);
      else {
        let out=trim;
        for(const [pl,tr] of Object.entries(dict)) if(out.includes(pl)) out=out.split(pl).join(tr);
        if(out!==trim)n.nodeValue=raw.replace(trim,out);
      }
    }
    document.querySelectorAll('option').forEach(o=>{if(!o.dataset.apoPl)o.dataset.apoPl=o.textContent.trim();o.textContent=translateText(o.dataset.apoPl,l)});
    const count=document.getElementById('resultCount');
    if(count){const m=count.textContent.match(/Pokazano\s+(\d+)\s+z\s+(\d+)\s+monet/);if(m)count.textContent=l==='de'?`${m[1]} von ${m[2]} Münzen angezeigt`:l==='en'?`Showing ${m[1]} of ${m[2]} coins`:`${m[1]} monnaie(s) sur ${m[2]} affichée(s)`;}
    const selected=document.getElementById('selectedInfo');
    if(selected){const m=selected.textContent.match(/Zaznaczono:\s*(\d+)/);if(m)selected.textContent=l==='de'?`Ausgewählt: ${m[1]}`:l==='en'?`Selected: ${m[1]}`:`Sélection : ${m[1]}`;}
  }
  let timer;function schedule(){clearTimeout(timer);timer=setTimeout(walk,0)}
  addEventListener('DOMContentLoaded',()=>{walk();new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true,characterData:true});});
})();
