(()=>{const K='apomonet_language_v2',D={
'Notowania aukcyjne':{en:'Auction records',de:'Auktionsresultate',fr:'Résultats de vente'},
'Brak porównywalnych notowań w lokalnej bazie faktów rynkowych.':{en:'No comparable records in the local market-facts database.',de:'Keine vergleichbaren Ergebnisse in der lokalen Marktdatenbank.',fr:'Aucun résultat comparable dans la base locale de faits de marché.'},
'Notowania aukcyjne — ostatnie 10 lat':{en:'Auction records — last 10 years',de:'Auktionsresultate — letzte 10 Jahre',fr:'Résultats de vente — 10 dernières années'},
'Porównywalne':{en:'Comparable',de:'Vergleichbar',fr:'Comparables'},
'Ścisłe dopasowania':{en:'Strict matches',de:'Enge Treffer',fr:'Correspondances strictes'},
'Mediana':{en:'Median',de:'Median',fr:'Médiane'},
'Zakres rynku':{en:'Market range',de:'Marktspanne',fr:'Fourchette du marché'},
'Pokaż źródła notowań':{en:'Show record sources',de:'Quellen anzeigen',fr:'Afficher les sources'},
'Cena młotkowa':{en:'Hammer price',de:'Zuschlagspreis',fr:'Prix marteau'},
'Cena z opłatami (opcjonalnie)':{en:'Total price incl. fees (optional)',de:'Gesamtpreis inkl. Gebühren (optional)',fr:'Prix total avec frais (facultatif)'},
'Dodaj fakt cenowy':{en:'Add market fact',de:'Marktdatum hinzufügen',fr:'Ajouter un fait de marché'},
'Fakty cenowe':{en:'Market facts',de:'Marktdaten',fr:'Faits de marché'},
'Zakres rynku 10–90%':{en:'Market range 10–90%',de:'Marktspanne 10–90 %',fr:'Fourchette 10–90 %'},
'Porównywalne / 10 lat':{en:'Comparable / 10 years',de:'Vergleichbar / 10 Jahre',fr:'Comparables / 10 ans'},
'Źródło →':{en:'Source →',de:'Quelle →',fr:'Source →'}
};function go(){const l=localStorage.getItem(K)||'pl';if(l==='pl')return;const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n;while(n=w.nextNode()){if(!n.parentElement||['SCRIPT','STYLE'].includes(n.parentElement.tagName))continue;const raw=n.nodeValue,t=raw.trim(),x=D[t]?.[l];if(x)n.nodeValue=raw.replace(t,x)}}addEventListener('DOMContentLoaded',()=>{setTimeout(go,20);new MutationObserver(()=>go()).observe(document.body,{childList:true,subtree:true,characterData:true})})})();