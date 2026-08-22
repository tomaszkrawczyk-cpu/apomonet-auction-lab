(()=>{
 if(!location.pathname.endsWith('analyze.html'))return;
 const D={
 'Najlepsze porównania aukcyjne':{en:'Best auction comparisons',de:'Beste Auktionsvergleiche',fr:'Meilleures comparaisons d’enchères'},
 'Brak zweryfikowanych rekordów do pokazania.':{en:'No verified records to display.',de:'Keine verifizierten Datensätze vorhanden.',fr:'Aucune fiche vérifiée à afficher.'},
 'Szacowany koszt zakupu':{en:'Estimated purchase cost',de:'Geschätzte Gesamtkosten',fr:'Coût d’achat estimé'},
 'Prowizja kupującego':{en:"Buyer's premium",de:'Aufgeld',fr:'Commission acheteur'},
 'VAT od prowizji':{en:'VAT on premium',de:'MwSt. auf Aufgeld',fr:'TVA sur commission'},
 'Brak ceny młotkowej lub zweryfikowanej reguły opłat.':{en:'No hammer price or verified fee rule.',de:'Kein Zuschlagspreis oder keine verifizierte Gebührenregel.',fr:'Pas de prix marteau ni de règle de frais vérifiée.'},
 'Nietypowa cena':{en:'Unusual price',de:'Ungewöhnlicher Preis',fr:'Prix atypique'},
 'Konflikt danych źródłowych':{en:'Source-data conflict',de:'Konflikt der Quelldaten',fr:'Conflit entre sources'},
 'Jakość źródła':{en:'Source quality',de:'Quellenqualität',fr:'Qualité de la source'},
 'Świeżość źródła':{en:'Source freshness',de:'Aktualität der Quelle',fr:'Actualité de la source'},
 'Cena młotkowa':{en:'Hammer price',de:'Zuschlagspreis',fr:'Prix marteau'},
 'Cena realizacji':{en:'Realized price',de:'Realisierter Preis',fr:'Prix réalisé'},
 'Cena całkowita':{en:'Total price',de:'Gesamtpreis',fr:'Prix total'},
 'Cena':{en:'Price',de:'Preis',fr:'Prix'},
 'Otwórz źródło →':{en:'Open source →',de:'Quelle öffnen →',fr:'Ouvrir la source →'},
 'Waluta obca':{en:'Foreign currency',de:'Fremdwährung',fr:'Devise étrangère'},
 'Kontekst siły nabywczej':{en:'Purchasing-power context',de:'Kaufkraftkontext',fr:'Contexte de pouvoir d’achat'}
 };
 const lang=()=>window.ApoLanguageRegistry?.current?.()||window.ApoI18n?.current?.()||localStorage.getItem('apomonet_language_v2')||'pl';
 function go(){const l=lang();if(l==='pl')return;const root=document.getElementById('auctionComparableCards');if(!root)return;const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let n;while(n=w.nextNode()){if(!n.parentElement||['SCRIPT','STYLE'].includes(n.parentElement.tagName))continue;const raw=n.nodeValue,t=raw.trim();let x=D[t]?.[l]||D[t]?.en;if(!x){for(const [pl,tr] of Object.entries(D)){if(t.startsWith(pl)){x=(tr[l]||tr.en)+t.slice(pl.length);break}}}if(x)n.nodeValue=raw.replace(t,x)}}
 addEventListener('DOMContentLoaded',()=>setInterval(go,650));['languagechange','apo-language-changed','apomonet:language-change'].forEach(e=>addEventListener(e,go));
})();