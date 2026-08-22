(()=>{
const K='apomonet_language_v2';
const D={
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
'Źródło →':{en:'Source →',de:'Quelle →',fr:'Source →'},
'Konflikt danych źródłowych — niewliczany do wyceny':{en:'Source-data conflict — excluded from valuation',de:'Konflikt der Quelldaten — nicht in der Bewertung berücksichtigt',fr:'Conflit de données source — exclu de l’estimation'},
'Brak zweryfikowanego kursu — niewliczane do wyceny PLN':{en:'No verified FX rate — excluded from PLN valuation',de:'Kein verifizierter Wechselkurs — nicht in der PLN-Bewertung berücksichtigt',fr:'Pas de taux de change vérifié — exclu de l’estimation en PLN'},
'Kurs z dnia sprzedaży':{en:'FX rate from the sale date',de:'Wechselkurs vom Verkaufstag',fr:'Taux de change du jour de la vente'},
'Kurs blisko daty sprzedaży':{en:'FX rate close to the sale date',de:'Wechselkurs nahe am Verkaufsdatum',fr:'Taux de change proche de la date de vente'},
'Kurs zbyt odległy od daty sprzedaży':{en:'FX rate too far from the sale date',de:'Wechselkurs zu weit vom Verkaufsdatum entfernt',fr:'Taux de change trop éloigné de la date de vente'},
'Niska płynność':{en:'Low liquidity',de:'Geringe Liquidität',fr:'Faible liquidité'},
'Umiarkowana płynność':{en:'Moderate liquidity',de:'Mittlere Liquidität',fr:'Liquidité modérée'},
'Wysoka płynność':{en:'High liquidity',de:'Hohe Liquidität',fr:'Forte liquidité'}
};
const language=()=>localStorage.getItem(K)||'pl';
function translated(text,l){const direct=D[text]?.[l];if(direct)return direct;const registry=window.ApoLanguageRegistry;if(registry?.translate)return registry.translate(text,l,{fallback:['en','pl']});return D[text]?.en||text}
function go(){const l=language();if(l==='pl')return;const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n;while(n=w.nextNode()){if(!n.parentElement||['SCRIPT','STYLE'].includes(n.parentElement.tagName))continue;const raw=n.nodeValue,t=raw.trim();if(!t)continue;const x=translated(t,l);if(x&&x!==t)n.nodeValue=raw.replace(t,x)}}
addEventListener('DOMContentLoaded',()=>{setTimeout(go,20);new MutationObserver(()=>go()).observe(document.body,{childList:true,subtree:true,characterData:true});addEventListener('languagechange',go);addEventListener('apo-language-changed',go)})
})();