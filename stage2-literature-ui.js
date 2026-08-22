(()=>{
  if(!location.pathname.endsWith('analyze.html'))return;
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const lang=()=>localStorage.getItem('apomonet_language_v2')||'pl';
  const T={
    title:{pl:'Literatura i katalogi',en:'Literature and catalogs',de:'Literatur und Kataloge',fr:'Littérature et catalogues'},
    none:{pl:'Brak potwierdzonego odniesienia katalogowego dla tej analizy. APOMONET nie dopisuje katalogu na podstawie samego rocznika.',en:'No catalog reference was confirmed for this analysis. APOMONET does not assign a catalog from the year alone.',de:'Für diese Analyse wurde keine Katalogreferenz bestätigt. APOMONET weist keinen Katalog allein anhand des Jahres zu.',fr:'Aucune référence de catalogue n’a été confirmée pour cette analyse. APOMONET n’attribue pas de catalogue sur la seule base de l’année.'},
    confirmed:{pl:'Pokazano wyłącznie odniesienia potwierdzone w analizie szczegółowej.',en:'Only references confirmed in the detailed analysis are shown.',de:'Es werden nur in der Detailanalyse bestätigte Referenzen angezeigt.',fr:'Seules les références confirmées dans l’analyse détaillée sont affichées.'},
    rarity:{pl:'rzadkość',en:'rarity',de:'Seltenheit',fr:'rareté'},
    historical:{pl:'Historyczna wartość katalogowa',en:'Historical catalog value',de:'Historischer Katalogwert',fr:'Valeur historique du catalogue'},
    notCurrent:{pl:'nie jest to współczesna wycena PLN',en:'this is not a current PLN valuation',de:'dies ist keine aktuelle PLN-Bewertung',fr:'ceci n’est pas une estimation actuelle en PLN'}
  };
  function tr(key){const l=lang(),x=T[key]?.[l];if(x)return x;const reg=window.ApoLanguageRegistry;if(reg?.translate)return reg.translate(T[key]?.pl||key,l,{fallback:['en','pl']});return T[key]?.en||T[key]?.pl||key}
  function render(payload=window.__apoConfirmedStage2Literature){
    const panel=document.getElementById('deepPanel'),text=document.getElementById('deepText');if(!panel||!text)return;
    let box=document.getElementById('stage2Literature');
    if(!box){box=document.createElement('div');box.id='stage2Literature';box.className='detail';text.after(box)}
    const refs=payload?.references||[];
    if(!refs.length){box.innerHTML=`<b>${esc(tr('title'))}</b><p class="muted">${esc(tr('none'))}</p>`;return}
    const rows=refs.map(r=>{const rarity=r.rarity?` <span class="muted">• ${esc(tr('rarity'))} ${esc(r.rarity)}</span>`:'';const hist=r.historicalValue?`<small style="display:block;margin-top:4px">${esc(tr('historical'))}: ${esc(r.historicalValue)} — ${esc(tr('notCurrent'))}.</small>`:'';return `<div style="margin-top:10px"><strong>${esc(r.label)}</strong>: ${esc(r.value)}${rarity}${hist}</div>`}).join('');
    box.innerHTML=`<b>${esc(tr('title'))}</b><p class="muted">${esc(tr('confirmed'))}</p>${rows}`;
  }
  window.addEventListener('apo-stage2-literature',e=>render(e.detail));
  window.addEventListener('languagechange',()=>render());
  window.addEventListener('apo-language-changed',()=>render());
  const init=()=>{if(window.__apoConfirmedStage2Literature)render()};
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init):init();
})();
