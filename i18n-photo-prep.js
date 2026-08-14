(()=>{const K='apomonet_language_v2',D={
'Zdjęcie do albumu':{en:'Album photo',de:'Albumfoto',fr:'Photo pour l’album'},
'Chcesz, żebym wyciął tło?':{en:'Would you like me to remove the background?',de:'Soll ich den Hintergrund entfernen?',fr:'Voulez-vous que je supprime l’arrière-plan ?'},
'Oryginalne zdjęcia pozostaną bez zmian. Wycięta wersja będzie używana tylko jako zdjęcie prezentacyjne w albumie i eksporcie.':{en:'The original photos will remain unchanged. The cut-out version will only be used as the presentation image in the album and export.',de:'Die Originalfotos bleiben unverändert. Die freigestellte Version wird nur als Präsentationsbild im Album und Export verwendet.',fr:'Les photos originales resteront inchangées. La version détourée sera utilisée uniquement comme image de présentation dans l’album et l’export.'},
'✂️ Tak — usuń tło':{en:'✂️ Yes — remove background',de:'✂️ Ja — Hintergrund entfernen',fr:'✂️ Oui — supprimer l’arrière-plan'},
'🖼️ Nie — zostaw oryginalne zdjęcie':{en:'🖼️ No — keep original photo',de:'🖼️ Nein — Originalfoto behalten',fr:'🖼️ Non — garder la photo originale'},
'⏭️ Zapisz bez zdjęcia w albumie':{en:'⏭️ Save without a photo in the album',de:'⏭️ Ohne Foto im Album speichern',fr:'⏭️ Enregistrer sans photo dans l’album'},
'✂️ Usuń tło':{en:'✂️ Remove background',de:'✂️ Hintergrund entfernen',fr:'✂️ Supprimer l’arrière-plan'},
'🖼️ Oryginał':{en:'🖼️ Original',de:'🖼️ Original',fr:'🖼️ Original'},
'🚫 Bez zdjęcia':{en:'🚫 No photo',de:'🚫 Ohne Foto',fr:'🚫 Sans photo'},
'Zdjęcie pominięte w albumie':{en:'Photo omitted from album',de:'Foto im Album ausgelassen',fr:'Photo omise de l’album'},
'Brak zapisanego zdjęcia':{en:'No saved photo',de:'Kein gespeichertes Foto',fr:'Aucune photo enregistrée'},
'Wycinam tło…':{en:'Removing background…',de:'Hintergrund wird entfernt…',fr:'Suppression de l’arrière-plan…'}
};function go(){const l=localStorage.getItem(K)||'pl';if(l==='pl')return;const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n;while(n=w.nextNode()){if(!n.parentElement||['SCRIPT','STYLE'].includes(n.parentElement.tagName))continue;const raw=n.nodeValue,t=raw.trim(),x=D[t]?.[l];if(x)n.nodeValue=raw.replace(t,x)}}addEventListener('DOMContentLoaded',()=>{setTimeout(go,10);new MutationObserver(()=>go()).observe(document.body,{childList:true,subtree:true,characterData:true})})})();