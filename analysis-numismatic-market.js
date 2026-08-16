(()=>{
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=s=>String(s||'').trim();
function language(){return localStorage.getItem('apomonet_language_v2')||'pl'}
const T={
 pl:{title:'Rzadkość katalogowa',rarity:'Rzadkość (Kopicki)',ref:'Kopicki',unknown:'Nie ustalono',pending:'Uruchom „Analizę szczegółową”, aby spróbować ustalić numer katalogowy i stopień rzadkości. Wynik katalogowy pokazujemy tylko wtedy, gdy analiza zwróci konkretną referencję.',candidate:'Wynik z analizy szczegółowej — przed wykorzystaniem profesjonalnym wymaga potwierdzenia katalogiem lub przez eksperta.'},
 en:{title:'Catalog rarity',rarity:'Rarity (Kopicki)',ref:'Kopicki',unknown:'Not determined',pending:'Run “Detailed analysis” to try to determine the catalog reference and rarity grade. Catalog data is shown only when a concrete reference is returned.',candidate:'Result from detailed analysis — confirm it against the catalog or with an expert before professional use.'},
 de:{title:'Katalog-Seltenheit',rarity:'Seltenheit (Kopicki)',ref:'Kopicki',unknown:'Nicht bestimmt',pending:'Starten Sie die „Detailanalyse“, um Katalognummer und Seltenheitsgrad zu bestimmen. Katalogdaten werden nur bei einer konkreten Referenz angezeigt.',candidate:'Ergebnis der Detailanalyse — vor professioneller Nutzung im Katalog oder durch einen Experten bestätigen.'},
 fr:{title:'Rareté au catalogue',rarity:'Rareté (Kopicki)',ref:'Kopicki',unknown:'Non déterminé',pending:'Lancez « Analyse détaillée » pour tenter de déterminer la référence et le degré de rareté. Les données de catalogue ne sont affichées que si une référence concrète est renvoyée.',candidate:'Résultat de l’analyse détaillée — à confirmer dans le catalogue ou par un expert avant usage professionnel.'}
};
function tr(){return T[language()]||T.pl}
function validRarity(value){const v=norm(value).toUpperCase().replace(/\s+/g,'');return /^(?:R|R[1-8])$/.test(v)?v:''}
function parseDeep(){
 const root=document.getElementById('deepText');if(!root)return null;
 const labels=[...root.querySelectorAll('b')];
 const label=labels.find(x=>/Katalog Kopickiego|Kopicki/i.test(x.textContent||''));
 if(!label)return null;
 let p=label.nextElementSibling;while(p&&p.tagName!=='P')p=p.nextElementSibling;
 const text=norm(p?.textContent);if(!text||/Nie ustalono|Not determined|Nicht bestimmt|Non déterminé/i.test(text))return null;
 const parts=text.split(/\s*[•|]\s*/).map(norm).filter(Boolean);
 const rarity=parts.map(validRarity).find(Boolean)||validRarity(text.match(/\bR[1-8]?\b/i)?.[0]);
 const reference=parts.find(x=>!validRarity(x))||'';
 if(!reference&&!rarity)return null;
 return{reference,rarity};
}
function sessionCatalog(){
 try{const s=JSON.parse(sessionStorage.getItem('apomonetAnalysisSession')||'null'),d=s?.a?.detail||s?.a||{};const reference=norm(d.kopickiReference),rarity=validRarity(d.kopickiRarity||d.rarity);return reference||rarity?{reference,rarity}:null}catch{return null}
}
function current(){return parseDeep()||sessionCatalog()}
function render(){
 if(!location.pathname.endsWith('analyze.html'))return;
 const facts=document.getElementById('facts');if(!facts?.children.length)return;
 let box=document.getElementById('catalogRarity');if(!box){box=document.createElement('div');box.id='catalogRarity';box.className='detail';const anchor=document.getElementById('catalogCheck')||facts;anchor.after(box)}
 const d=tr(),c=current();
 if(!c){box.innerHTML='<b>'+esc(d.title)+'</b><div class="data-grid" style="margin-top:10px"><div><span>'+esc(d.ref)+'</span><strong>—</strong></div><div><span>'+esc(d.rarity)+'</span><strong>'+esc(d.unknown)+'</strong></div></div><p class="muted">'+esc(d.pending)+'</p>';return}
 box.innerHTML='<b>'+esc(d.title)+'</b><div class="data-grid" style="margin-top:10px"><div><span>'+esc(d.ref)+'</span><strong>'+esc(c.reference||'—')+'</strong></div><div><span>'+esc(d.rarity)+'</span><strong>'+esc(c.rarity||d.unknown)+'</strong></div></div><p class="muted">'+esc(d.candidate)+'</p>';
}
function wrapSave(){if(!window.ApoMonet||ApoMonet.__catalogWrapped)return;const old=ApoMonet.upsertCoin.bind(ApoMonet);ApoMonet.upsertCoin=(coin)=>{const c=current();return old(c?{...coin,kopickiReference:coin.kopickiReference||c.reference||'',kopickiRarity:coin.kopickiRarity||c.rarity||'',rarity:coin.rarity||c.rarity||''}:coin)};ApoMonet.__catalogWrapped=true}
function init(){if(!location.pathname.endsWith('analyze.html'))return;wrapSave();const facts=document.getElementById('facts'),deep=document.getElementById('deepText');if(facts)new MutationObserver(()=>setTimeout(render,0)).observe(facts,{childList:true,subtree:true,characterData:true});if(deep)new MutationObserver(()=>setTimeout(render,0)).observe(deep,{childList:true,subtree:true,characterData:true});addEventListener('apomonet:language-change',()=>setTimeout(render,0));setTimeout(render,120)}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init):init();
})();