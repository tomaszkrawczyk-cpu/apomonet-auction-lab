(()=>{const D={
'Zdjęcie do albumu':{en:'Album photo',de:'Albumfoto',fr:'Photo pour l’album'},
'Chcesz, żebym usunął tło?':{en:'Would you like me to remove the background?',de:'Soll der Hintergrund entfernt werden?',fr:'Voulez-vous supprimer l’arrière-plan ?'},
'Najlepszy wynik daje jednolite, kontrastowe tło. Oryginały pozostaną bez zmian, a wersja PNG z przezroczystym tłem trafi tylko do albumu i eksportu.':{en:'A plain, contrasting background gives the best result. The originals stay unchanged; only the album and export use a transparent PNG.',de:'Ein einfarbiger, kontrastreicher Hintergrund liefert das beste Ergebnis. Die Originale bleiben unverändert; Album und Export verwenden nur eine transparente PNG-Version.',fr:'Un fond uni et contrasté donne le meilleur résultat. Les originaux restent inchangés ; seuls l’album et l’export utilisent un PNG transparent.'},
'✂️ Tak — usuń tło':{en:'✂️ Yes — remove background',de:'✂️ Ja — Hintergrund entfernen',fr:'✂️ Oui — supprimer l’arrière-plan'},
'🖼️ Nie — zostaw oryginalne zdjęcie':{en:'🖼️ No — keep original photo',de:'🖼️ Nein — Originalfoto behalten',fr:'🖼️ Non — garder la photo originale'},
'⏭️ Zapisz bez zdjęcia w albumie':{en:'⏭️ Save without a photo in the album',de:'⏭️ Ohne Foto im Album speichern',fr:'⏭️ Enregistrer sans photo dans l’album'},
'Anuluj':{en:'Cancel',de:'Abbrechen',fr:'Annuler'},
'Usuwam tło…':{en:'Removing background…',de:'Hintergrund wird entfernt…',fr:'Suppression de l’arrière-plan…'},
'Nie udało się pewnie wykryć krawędzi monety. Zdjęcie nie zostało zmienione. Zrób je na jednolitym, kontrastowym tle i spróbuj ponownie.':{en:'The coin edge could not be detected reliably, so the photo was not changed. Use a plain, contrasting background and try again.',de:'Der Münzrand wurde nicht sicher erkannt; das Foto wurde nicht verändert. Verwenden Sie einen einfarbigen, kontrastreichen Hintergrund und versuchen Sie es erneut.',fr:'Le bord de la monnaie n’a pas été détecté avec certitude ; la photo n’a pas été modifiée. Utilisez un fond uni et contrasté, puis réessayez.'},
'Tło usunięte. Sprawdź jeszcze rant przed zapisaniem.':{en:'Background removed. Check the rim before saving.',de:'Hintergrund entfernt. Prüfen Sie vor dem Speichern noch den Rand.',fr:'Arrière-plan supprimé. Vérifiez le bord avant d’enregistrer.'},
'Czy krawędzie wyglądają dobrze?':{en:'Do the edges look right?',de:'Sehen die Ränder richtig aus?',fr:'Les bords sont-ils corrects ?'},
'Jeśli widzisz białe tło, cień albo ucięty rant, zostaw oryginalne zdjęcie.':{en:'If you see a white area, a shadow or a cropped rim, keep the original photo.',de:'Wenn Sie eine weiße Fläche, einen Schatten oder einen abgeschnittenen Rand sehen, behalten Sie das Originalfoto.',fr:'Si vous voyez une zone blanche, une ombre ou un bord coupé, conservez la photo originale.'},
'✓ Tak — zapisz wycięcie':{en:'✓ Yes — save the cutout',de:'✓ Ja — Freistellung speichern',fr:'✓ Oui — enregistrer le détourage'},
'🖼️ Zostaw oryginalne zdjęcie':{en:'🖼️ Keep the original photo',de:'🖼️ Originalfoto behalten',fr:'🖼️ Conserver la photo originale'},
'Wróć':{en:'Back',de:'Zurück',fr:'Retour'},
'Zdjęcie pominięte w albumie':{en:'Photo omitted from album',de:'Foto im Album ausgelassen',fr:'Photo omise de l’album'},
'Brak zapisanego zdjęcia':{en:'No saved photo',de:'Kein gespeichertes Foto',fr:'Aucune photo enregistrée'}
};
const lang=()=>window.ApoLanguageRegistry?.current?.()||window.ApoI18n?.current?.()||localStorage.getItem('apomonet_language_v2')||'pl';
const originals=new WeakMap();
function go(){const l=lang();const root=document.getElementById('albumPhotoPrep')||document.body;if(!root)return;const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let n;while(n=w.nextNode()){if(!n.parentElement||['SCRIPT','STYLE'].includes(n.parentElement.tagName))continue;const raw=n.nodeValue,t=raw.trim();if(!t)continue;if(!originals.has(n))originals.set(n,t);const src=originals.get(n);if(l==='pl'){if(t!==src)n.nodeValue=raw.replace(t,src);continue}const x=D[src]?.[l]||D[src]?.en;if(x)n.nodeValue=raw.replace(t,x)}}
function init(){setTimeout(go,10);new MutationObserver(()=>go()).observe(document.body,{childList:true,subtree:true,characterData:true})}
document.readyState==='loading'?addEventListener('DOMContentLoaded',init):init();['languagechange','apo-language-changed','apomonet:language-change'].forEach(e=>addEventListener(e,go));
})();