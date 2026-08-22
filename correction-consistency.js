(() => {
  const IDENTITY_FIELDS = ["nominal", "ruler", "year", "mint", "metal", "variant"];
  const UNKNOWN_VALUES = new Set(["nie ustalono", "unknown", "not determined", "unbestimmt", "nicht bestimmt", "non déterminé"]);
  const clean = (value) => String(value ?? "").trim();
  const comparable = (value) => clean(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pl-PL");
  const known = (value) => { const x=comparable(value); return Boolean(x)&&!UNKNOWN_VALUES.has(x); };
  const identityKey = (coin) => IDENTITY_FIELDS.map((key)=>comparable(coin?.[key])).join("|");
  function reanalysisResolved(coin){
    const key=identityKey(coin);
    return Boolean(coin?.userAccepted&&coin?.marketReanalysisCompletedAt&&coin?.detailReanalysisCompletedAt&&coin?.correctionReanalysisIdentityKey===key&&coin?.detailReanalysisIdentityKey===key);
  }
  function canonical(coin) { return [coin.nominal,coin.ruler,coin.mint,coin.year].map(clean).filter(known).join(" • "); }
  function changedFields(coin) { const raw=coin?.rawAI;if(!raw)return[];return IDENTITY_FIELDS.filter((key)=>{const accepted=clean(coin[key]),original=clean(raw[key]);return accepted&&comparable(accepted)!==comparable(original);}); }
  const differsFromRaw=(coin)=>changedFields(coin).length>0;
  const consistencyKey=(coin)=>identityKey(coin);
  function acceptedIdentity(coin) {
    const rows=[["Nominał",coin.nominal],["Władca / emitent",coin.ruler],["Rok",coin.year],["Mennica",coin.mint],["Metal",coin.metal],["Odmiana / typ",coin.variant]].filter(([,value])=>known(value));
    return rows.map(([label,value])=>`${label}: ${clean(value)}.`).join(" ");
  }
  const splitSentences=(value)=>clean(value).split(/(?<=[.!?])\s+/u).map(clean).filter(Boolean);
  const mentions=(value,needle)=>{const normalized=comparable(needle);return normalized.length>1&&comparable(value).includes(normalized);};
  function shouldDiscardSentence(sentence,coin,changed,index){
    if(!sentence)return true;if(index===0)return true;const normalized=comparable(sentence),raw=coin.rawAI||{};
    for(const key of changed)if(mentions(sentence,raw[key]))return true;
    if(changed.includes("mint")&&/mennic|mint|atelier|munzstatte|ceca/u.test(normalized)&&!mentions(sentence,coin.mint))return true;
    if(changed.includes("year")&&/\b(rok|roku|year|jahr|annee)\b/u.test(normalized)&&!mentions(sentence,coin.year))return true;
    if(changed.includes("nominal")&&/nominal|nominalu|denomination|nominale|dukat|talar|grosz|ort|szostak|trojak/u.test(normalized)&&!mentions(sentence,coin.nominal))return true;
    if(changed.includes("variant")&&/odmian|wariant|variant|variety|type|typ/u.test(normalized)&&!mentions(sentence,coin.variant))return true;
    return false;
  }
  function reconcileDescription(coin){
    if(!coin?.userAccepted)return coin;const changed=changedFields(coin);if(!changed.length)return coin;const key=consistencyKey(coin);if(coin.descriptionConsistencyKey===key)return coin;
    const source=clean(coin.fullDescription||coin.description||coin.rawAI?.fullDescription||coin.rawAI?.description),changedValuesArePresent=changed.every((field)=>mentions(source,coin[field])),staleRawValuesPresent=changed.some((field)=>mentions(source,coin.rawAI?.[field]));
    if(changedValuesArePresent&&!staleRawValuesPresent)return{...coin,descriptionConsistencyKey:key,descriptionReconciledAt:new Date().toISOString()};
    const observations=splitSentences(source).filter((sentence,index)=>!shouldDiscardSentence(sentence,coin,changed,index)),summary=acceptedIdentity(coin),description=[summary,...observations].filter(Boolean).join(" ");if(!description)return coin;
    return{...coin,description,fullDescription:description,descriptionConsistencyKey:key,descriptionReconciledAt:new Date().toISOString(),descriptionSource:"accepted-correction"};
  }
  function normalizeCoin(coin){
    if(!coin||!coin.userAccepted||!differsFromRaw(coin))return coin;let normalized={...coin};const title=canonical(normalized);if(title)normalized.title=title;normalized.canonicalTitle=title||normalized.title||"";
    if(!reanalysisResolved(normalized))normalized.needsReanalysis=true;
    normalized=reconcileDescription(normalized);
    if(!reanalysisResolved(normalized)&&/data nie została odczytana|nominał.*wymaga|konfliktu rok|wstrzymana/i.test(clean(normalized.valuationNote))){normalized.estimateLow=0;normalized.estimateHigh=0;normalized.estimatedPrice="";normalized.priceRange="";normalized.valuationNote="Wycena wymaga ponownej analizy po korekcie danych zaakceptowanych przez użytkownika.";}
    return normalized;
  }
  function installWriteGuard(){if(!window.ApoMonet||ApoMonet.__correctionConsistencyGuard)return;const original=ApoMonet.upsertCoin;ApoMonet.upsertCoin=function(coin){return original.call(ApoMonet,normalizeCoin(coin));};ApoMonet.__correctionConsistencyGuard=true;}
  function normalizeState(){if(!window.ApoMonet)return;const state=ApoMonet.load();let changed=false;state.coins=(state.coins||[]).map((coin)=>{const normalized=normalizeCoin(coin);if(JSON.stringify(normalized)!==JSON.stringify(coin))changed=true;return normalized;});if(changed)ApoMonet.save(state);}
  function syncAnalysisSession(coin){if(!coin)return;let old={};try{old=JSON.parse(sessionStorage.getItem("apomonetAnalysisSession")||"{}")||{}}catch{}const corrected={...(old.a||{}),...coin,description:coin.description||old.a?.description||"",fullDescription:coin.fullDescription||coin.description||old.a?.fullDescription||old.a?.description||"",userAccepted:true,correctedAt:new Date().toISOString()};const session={...old,id:coin.id,a:corrected,imgs:Array.isArray(old.imgs)?old.imgs:[coin.obverseImage||null,coin.reverseImage||null],analysisImgs:Array.isArray(old.analysisImgs)?old.analysisImgs:[coin.obverseImage||null,coin.reverseImage||null],photoDiagnostics:Array.isArray(old.photoDiagnostics)?old.photoDiagnostics:[null,null],at:Date.now(),version:Math.max(Number(old.version)||0,5)};try{sessionStorage.setItem("apomonetAnalysisSession",JSON.stringify(session))}catch(error){console.warn("[correction-session-sync]",error)}}
  function repairExport(){if(!location.pathname.endsWith("export.html"))return;normalizeState();const ids=JSON.parse(sessionStorage.getItem("apomonet_export_ids")||"[]"),state=ApoMonet.load();let coins=(state.coins||[]).filter((coin)=>ids.includes(coin.id));if(!coins.length){try{coins=JSON.parse(sessionStorage.getItem("apomonet_demo_export_coins")||"[]")}catch{coins=[]}}document.querySelectorAll(".export-card").forEach((card,index)=>{const coin=normalizeCoin(coins[index]);if(!coin)return;const heading=card.querySelector("h2");if(heading)heading.textContent=coin.canonicalTitle||coin.title||"Coin";const cells=[...card.querySelectorAll(".data-grid div")],valuationCell=cells[10];if(valuationCell&&coin.needsReanalysis){const label=valuationCell.querySelector("span"),labelText=label?.textContent||"Valuation";valuationCell.replaceChildren();const span=document.createElement("span");span.textContent=labelText;valuationCell.append(span,document.createTextNode("Requires reanalysis after user-corrected identification data."));}});}
  function afterSubmit(){if(!location.pathname.endsWith("coin-edit.html"))return;const form=document.getElementById("form");if(!form)return;form.addEventListener("submit",()=>setTimeout(()=>{normalizeState();const id=new URLSearchParams(location.search).get("id"),coin=id?ApoMonet.getCoin(id):null;if(coin){syncAnalysisSession(coin);const title=document.getElementById("title"),description=document.getElementById("description");if(title&&coin.canonicalTitle)title.value=coin.canonicalTitle;if(description&&coin.description)description.value=coin.description}},0));document.addEventListener("click",event=>{const target=event.target?.closest?.("#backResult,#chooseAlbum,#openCard");if(!target)return;normalizeState();const id=new URLSearchParams(location.search).get("id"),coin=id?ApoMonet.getCoin(id):null;if(coin)syncAnalysisSession(coin)});}
  window.ApoCorrectionConsistency=Object.freeze({changedFields,reconcileDescription,normalizeCoin,normalizeState,syncAnalysisSession,reanalysisResolved,identityKey});
  function init(){installWriteGuard();normalizeState();afterSubmit();repairExport()}
  document.readyState==="loading"?document.addEventListener("DOMContentLoaded",init):init();
})();