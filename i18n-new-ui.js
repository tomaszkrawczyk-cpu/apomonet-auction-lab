(()=>{
 const K='apomonet_language_v2';const D={
 '🎯 Pewność pól':{en:'🎯 Field confidence',de:'🎯 Feldsicherheit',fr:'🎯 Confiance par champ'},
 '📏 Dane właściciela — opcjonalnie':{en:'📏 Owner data — optional',de:'📏 Angaben des Besitzers — optional',fr:'📏 Données du propriétaire — facultatif'},
 'Waga (g)':{en:'Weight (g)',de:'Gewicht (g)',fr:'Poids (g)'},'Średnica (mm)':{en:'Diameter (mm)',de:'Durchmesser (mm)',fr:'Diamètre (mm)'},
 'Rant / dodatkowa cecha':{en:'Edge / additional feature',de:'Rand / zusätzliches Merkmal',fr:'Tranche / caractéristique supplémentaire'},
 'Zapisz dane do tej analizy':{en:'Save data to this analysis',de:'Daten für diese Analyse speichern',fr:'Enregistrer pour cette analyse'},
 'PRYWATNE • TYLKO TO URZĄDZENIE':{en:'PRIVATE • THIS DEVICE ONLY',de:'PRIVAT • NUR DIESES GERÄT',fr:'PRIVÉ • CET APPAREIL UNIQUEMENT'},
 'Twoja kolekcja w skrócie':{en:'Your collection at a glance',de:'Ihre Sammlung im Überblick',fr:'Votre collection en bref'},
 'monet':{en:'coins',de:'Münzen',fr:'monnaies'},'albumów':{en:'albums',de:'Alben',fr:'albums'},
 'suma dostępnych wycen':{en:'sum of available valuations',de:'Summe verfügbarer Bewertungen',fr:'somme des estimations disponibles'},
 'Otwórz kolekcję':{en:'Open collection',de:'Sammlung öffnen',fr:'Ouvrir la collection'},
 'Wszystkie rzadkości':{en:'All rarities',de:'Alle Seltenheiten',fr:'Toutes les raretés'},'Wszystkie stany':{en:'All conditions',de:'Alle Erhaltungen',fr:'Tous les états'},
 'Połączenie telefonu z analizą zostało przerwane. Zdjęcia pozostają wybrane — spróbuj ponownie bez ponownego wczytywania.':{en:'The phone connection to analysis was interrupted. Your photos remain selected — try again without reloading them.',de:'Die Verbindung des Telefons zur Analyse wurde unterbrochen. Die Fotos bleiben ausgewählt — versuchen Sie es erneut, ohne sie neu zu laden.',fr:'La connexion du téléphone à l’analyse a été interrompue. Les photos restent sélectionnées — réessayez sans les recharger.'}
 };
 function tr(){const l=localStorage.getItem(K)||'pl';if(l==='pl'||!['en','de','fr'].includes(l))return;const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n;while(n=w.nextNode()){if(!n.parentElement||['SCRIPT','STYLE'].includes(n.parentElement.tagName))continue;const raw=n.nodeValue,s=raw.trim(),v=D[s]?.[l];if(v)n.nodeValue=raw.replace(s,v)}for(const e of document.querySelectorAll('option')){const v=D[e.textContent.trim()]?.[l];if(v)e.textContent=v}}
 addEventListener('DOMContentLoaded',()=>{tr();new MutationObserver(()=>tr()).observe(document.body,{subtree:true,childList:true})});
})();
