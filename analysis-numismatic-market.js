(()=>{
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=s=>String(s||'').trim();
function language(){return localStorage.getItem('apomonet_language_v2')||'pl'}
const T={
 pl:{title:'Rzadkość katalogowa',rarity:'Rzadkość (Kopicki)',ref:'Kopicki',unknown:'Nie ustalono',pending:'Uruchom „Analizę szczegółową”, aby spróbować ustalić numer katalogowy i stopień rzadkości. Wynik katalogowy pokazujemy tylko wtedy, gdy analiza zwróci konkretną referencję.',candidate:'Wynik z analizy szczegółowej — przed wykorzystaniem profesjonalnym wymaga potwierdzenia katalogiem lub przez eksperta.',auctionTitle:'Notowania aukcyjne',auctionCount:'Porównywalne notowania — 10 lat',auctionRange:'Zakres cen',auctionNone:'Brak zweryfikowanych porównywalnych notowań w lokalnym archiwum APOMONET.',auctionLimited:'Znaleziono zweryfikowane fakty aukcyjne, ale próbka jest zbyt mała lub zbyt słabo dopasowana do wiarygodnej wyceny.',auctionNote:'Liczba obejmuje wyłącznie zapisane, zweryfikowane fakty aukcyjne dopasowane do tej monety. Nie jest to stopień rzadkości.',sources:'Źródła'},
 en:{title:'Catalog rarity',rarity:'Rarity (Kopicki)',ref:'Kopicki',unknown:'Not determined',pending:'Run “Detailed analysis” to try to determine the catalog reference and rarity grade. Catalog data is shown only when a concrete reference is returned.',candidate:'Result from detailed analysis — confirm it against the catalog or with an expert before professional use.',auctionTitle:'Auction records',auctionCount:'Comparable records — 10 years',auctionRange:'Price range',auctionNone:'No verified comparable auction records are available in the local APOMONET archive.',auctionLimited:'Verified auction facts were found, but the sample is too small or too weakly matched for a reliable valuation.',auctionNote:'The count includes only stored, verified auction facts matched to this coin. It is not a rarity grade.',sources:'Sources'},
 de:{title:'Katalog-Seltenheit',rarity:'Seltenheit (Kopicki)',ref:'Kopicki',unknown:'Nicht bestimmt',pending:'Starten Sie die „Detailanalyse“, um Katalognummer und Seltenheitsgrad zu bestimmen. Katalogdaten werden nur bei einer konkreten Referenz angezeigt.',candidate:'Ergebnis der Detailanalyse — vor professioneller Nutzung im Katalog oder durch einen Experten bestätigen.',auctionTitle:'Auktionsnotierungen',auctionCount:'Vergleichbare Notierungen — 10 Jahre',auctionRange:'Preisbereich',auctionNone:'Im lokalen APOMONET-Archiv sind keine verifizierten vergleichbaren Auktionsnotierungen vorhanden.',auctionLimited:'Verifizierte Auktionsdaten wurden gefunden, die Stichprobe ist jedoch zu klein oder zu schwach passend für eine verlässliche Bewertung.',auctionNote:'Die Anzahl umfasst nur gespeicherte, verifizierte und zu dieser Münze passende Auktionsfakten. Sie ist kein Seltenheitsgrad.',sources:'Quellen'},
 fr:{title:'Rareté au catalogue',rarity:'Rareté (Kopicki)',ref:'Kopicki',unknown:'Non déterminé',pending:'Lancez « Analyse détaillée » pour tenter de déterminer la référence et le degré de rareté. Les données de catalogue ne sont affichées que si une référence concrète est renvoyée.',candidate:'Résultat de l’analyse détaillée — à confirmer dans le catalogue ou par un expert avant usage professionnel.',auctionTitle:'Résultats d’enchères',auctionCount:'Résultats comparables — 10 ans',auctionRange:'Fourchette de prix',auctionNone:'Aucun résultat d’enchère comparable et vérifié dans l’archive locale APOMONET.',auctionLimited:'Des faits d’enchères vérifiés existent, mais l’échantillon est trop faible pour une estimation fiable.',auctionNote:'Le nombre comprend uniquement des faits d’enchères enregistrés, vérifiés et comparables. Ce n’est pas un degré de rareté.',sources:'Sources'}
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
function currentCoin(){
 try{const s=JSON.parse(sessionStorage.getItem('apomonetAnalysisSession')||'null');if(s?.a)return s.a}catch{}
 try{const facts=document.getElementById('facts');if(!facts)return null;const map={};for(const item of facts.children){const label=norm(item.querySelector('span')?.textContent).toLowerCase(),value=norm(item.querySelector('strong')?.textContent);if(!value)continue;if(/władca|ruler|herrscher|souverain/.test(label))map.ruler=value;else if(/nominał|nominal|nennwert|valeur/.test(label))map.nominal=value;else if(/rok|year|jahr|année/.test(label))map.year=value;else if(/mennica|mint|münzstätte|atelier/.test(label))map.mint=value;else if(/metal/.test(label))map.metal=value;else if(/odmiana|variant|variante/.test(label))map.variant=value}return Object.keys(map).length?map:null}catch{return null}
}
function marketFor(coin){
 if(!coin||!window.ApoArchive?.comparable)return{count:0,records:[],valuation:null,sources:[]};
 try{
  const records=ApoArchive.comparable(coin,10).filter(r=>r?.marketFact!==false&&r?.soldAt&&r?.source);
  const sourceCounts={};for(const r of records)sourceCounts[r.sourceLabel||r.source]=(sourceCounts[r.sourceLabel||r.source]||0)+1;
  const sources=Object.entries(sourceCounts).sort((a,b)=>b[1]-a[1]);
  const valuation=window.ApoArchive?.valuation?ApoArchive.valuation(coin,10,'PLN'):null;
  return{count:records.length,records,valuation,sources};
 }catch{return{count:0,records:[],valuation:null,sources:[]}}
}
function render(){
 if(!location.pathname.endsWith('analyze.html'))return;
 const facts=document.getElementById('facts');if(!facts?.children.length)return;
 let box=document.getElementById('catalogRarity');if(!box){box=document.createElement('div');box.id='catalogRarity';box.className='detail';const anchor=document.getElementById('catalogCheck')||facts;anchor.after(box)}
 const d=tr(),c=current();
 if(!c)box.innerHTML='<b>'+esc(d.title)+'</b><div class="data-grid" style="margin-top:10px"><div><span>'+esc(d.ref)+'</span><strong>—</strong></div><div><span>'+esc(d.rarity)+'</span><strong>'+esc(d.unknown)+'</strong></div></div><p class="muted">'+esc(d.pending)+'</p>';
 else box.innerHTML='<b>'+esc(d.title)+'</b><div class="data-grid" style="margin-top:10px"><div><span>'+esc(d.ref)+'</span><strong>'+esc(c.reference||'—')+'</strong></div><div><span>'+esc(d.rarity)+'</span><strong>'+esc(c.rarity||d.unknown)+'</strong></div></div><p class="muted">'+esc(d.candidate)+'</p>';
 let market=document.getElementById('auctionMarketFacts');if(!market){market=document.createElement('div');market.id='auctionMarketFacts';market.className='detail';box.after(market)}
 const m=marketFor(currentCoin()),range=m.valuation?.canEstimate?m.valuation.priceRange:'—';
 const sourceText=m.sources.length?m.sources.map(([name,count])=>`${name}: ${count}`).join(' • '):'—';
 const note=m.count===0?d.auctionNone:(m.valuation?.canEstimate?d.auctionNote:d.auctionLimited+' '+d.auctionNote);
 market.innerHTML='<b>'+esc(d.auctionTitle)+'</b><div class="data-grid" style="margin-top:10px"><div><span>'+esc(d.auctionCount)+'</span><strong>'+esc(String(m.count))+'</strong></div><div><span>'+esc(d.auctionRange)+'</span><strong>'+esc(range)+'</strong></div><div><span>'+esc(d.sources)+'</span><strong>'+esc(sourceText)+'</strong></div></div><p class="muted">'+esc(note)+'</p>';
 window.__apoMarketSnapshot={count:m.count,periodYears:10,priceRange:range==='—'?'':range,sources:m.sources.map(([source,count])=>({source,count})),verifiedOnly:true,updatedAt:new Date().toISOString()};
}
function wrapSave(){if(!window.ApoMonet||ApoMonet.__catalogWrapped)return;const old=ApoMonet.upsertCoin.bind(ApoMonet);ApoMonet.upsertCoin=(coin)=>{const c=current(),m=window.__apoMarketSnapshot;return old({...coin,...(c?{kopickiReference:coin.kopickiReference||c.reference||'',kopickiRarity:coin.kopickiRarity||c.rarity||'',rarity:coin.rarity||c.rarity||''}:{}),...(m?{auctionRecordCount10y:m.count,auctionMarketSnapshot:m}: {})})};ApoMonet.__catalogWrapped=true}
function init(){if(!location.pathname.endsWith('analyze.html'))return;wrapSave();const facts=document.getElementById('facts'),deep=document.getElementById('deepText');if(facts)new MutationObserver(()=>setTimeout(render,0)).observe(facts,{childList:true,subtree:true,characterData:true});if(deep)new MutationObserver(()=>setTimeout(render,0)).observe(deep,{childList:true,subtree:true,characterData:true});addEventListener('apomonet:language-change',()=>setTimeout(render,0));setTimeout(render,120)}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init):init();
})();
