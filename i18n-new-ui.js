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
 'Albumy':{en:'Albums',de:'Alben',fr:'Albums'},
 'Moje albumy':{en:'My albums',de:'Meine Alben',fr:'Mes albums'},
 'Twoja kolekcja, plany zakupowe i numizmatyczne marzenia — każdy album może mieć własny układ i filtry.':{en:'Your collection, purchase plans and numismatic dreams — each album can have its own layout and filters.',de:'Ihre Sammlung, Kaufpläne und numismatischen Wünsche — jedes Album kann ein eigenes Layout und eigene Filter haben.',fr:'Votre collection, vos projets d’achat et vos rêves numismatiques — chaque album peut avoir sa propre mise en page et ses filtres.'},
 '+ Nowy album':{en:'+ New album',de:'+ Neues Album',fr:'+ Nouvel album'},
 'Moje':{en:'Mine',de:'Meine',fr:'Mes'},
 'Moja kolekcja':{en:'My collection',de:'Meine Sammlung',fr:'Ma collection'},
 'Monety, które już mam. Od średniowiecza po II RP.':{en:'Coins I already own. From the Middle Ages to the Second Polish Republic.',de:'Münzen, die ich bereits besitze. Vom Mittelalter bis zur Zweiten Polnischen Republik.',fr:'Les monnaies que je possède déjà. Du Moyen Âge à la Deuxième République de Pologne.'},
 'Przykładowy album • miniatury monet':{en:'Sample album • coin thumbnails',de:'Beispielalbum • Münzminiaturen',fr:'Album exemple • miniatures des monnaies'},
 'Cele':{en:'Targets',de:'Ziele',fr:'Objectifs'},
 'Cele kolekcjonerskie':{en:'Collection targets',de:'Sammlerziele',fr:'Objectifs de collection'},
 'Monety, których aktywnie szukam na aukcjach.':{en:'Coins I am actively looking for at auctions.',de:'Münzen, nach denen ich aktiv auf Auktionen suche.',fr:'Monnaies que je recherche activement aux enchères.'},
 'Lista zakupowa • obserwowanie aukcji':{en:'Wish list • auction watch',de:'Kaufliste • Auktionsbeobachtung',fr:'Liste d’achat • suivi des enchères'},
 'Marzenia ✨':{en:'Dreams ✨',de:'Wünsche ✨',fr:'Rêves ✨'},
 'Monety marzeń':{en:'Dream coins',de:'Traummünzen',fr:'Monnaies de rêve'},
 'Rzadkie i wyjątkowe monety, które kiedyś chciałbym zdobyć.':{en:'Rare and exceptional coins I would like to acquire one day.',de:'Seltene und außergewöhnliche Münzen, die ich eines Tages erwerben möchte.',fr:'Des monnaies rares et exceptionnelles que j’aimerais acquérir un jour.'},
 'Numizmatyczna wishlista':{en:'Numismatic wish list',de:'Numismatische Wunschliste',fr:'Liste de souhaits numismatique'},
 'Własny':{en:'Custom',de:'Eigenes',fr:'Personnel'},
 'Własny album użytkownika.':{en:'Your custom album.',de:'Ihr eigenes Album.',fr:'Votre album personnel.'},
 'Zdjęcia demonstracyjne pochodzą z materiałów udostępnionych w Wikimedia Commons. Docelowo albumy użytkownika pokazują przede wszystkim zdjęcia jego własnych monet.':{en:'Demo images come from materials available on Wikimedia Commons. User albums ultimately show primarily photos of the user’s own coins.',de:'Die Demo-Bilder stammen aus auf Wikimedia Commons verfügbaren Materialien. Benutzeralben zeigen letztlich vor allem Fotos der eigenen Münzen.',fr:'Les images de démonstration proviennent de Wikimedia Commons. Les albums utilisateur affichent principalement les photos de ses propres monnaies.'},
 'Połączenie telefonu z analizą zostało przerwane. Zdjęcia pozostają wybrane — spróbuj ponownie bez ponownego wczytywania.':{en:'The phone connection to analysis was interrupted. Your photos remain selected — try again without reloading them.',de:'Die Verbindung des Telefons zur Analyse wurde unterbrochen. Die Fotos bleiben ausgewählt — versuchen Sie es erneut, ohne sie neu zu laden.',fr:'La connexion du téléphone à l’analyse a été interrompue. Les photos restent sélectionnées — réessayez sans les recharger.'}
 };
 function tr(){const l=localStorage.getItem(K)||'pl';if(l==='pl'||!['en','de','fr'].includes(l))return;const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n;while(n=w.nextNode()){if(!n.parentElement||['SCRIPT','STYLE'].includes(n.parentElement.tagName))continue;const raw=n.nodeValue,s=raw.trim(),v=D[s]?.[l];if(v)n.nodeValue=raw.replace(s,v)}for(const e of document.querySelectorAll('option')){const v=D[e.textContent.trim()]?.[l];if(v)e.textContent=v}for(const e of document.querySelectorAll('input[placeholder]')){const p=e.getAttribute('placeholder');if(p==='Szukaj albumu…')e.setAttribute('placeholder',l==='de'?'Album suchen…':l==='en'?'Search albums…':'Rechercher un album…')}}
 addEventListener('DOMContentLoaded',()=>{tr();new MutationObserver(()=>tr()).observe(document.body,{subtree:true,childList:true})});
})();
