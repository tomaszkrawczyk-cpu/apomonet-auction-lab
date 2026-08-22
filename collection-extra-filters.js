(()=>{
 function init(){if(!location.pathname.endsWith('collection.html')||!window.ApoMonet)return;const bar=document.querySelector('.filters');if(!bar||document.getElementById('rarityFilter'))return;const rarity=document.createElement('select'),grade=document.createElement('select');rarity.id='rarityFilter';rarity.className='input';grade.id='gradeFilter';grade.className='input';bar.append(rarity,grade);
  const sentinels=()=>window.ApoCanonicalRecordSentinels;
  const canonical=v=>sentinels()?.canonical?sentinels().canonical(v):String(v??'').trim();
  const normalized=v=>{const c=canonical(v);return c==='Nie ustalono'?'Nie ustalono':String(c||'').trim()};
  const lang=()=>window.ApoLanguageRegistry?.current?.()||window.ApoI18n?.current?.()||'pl';
  const labels={pl:{allRarity:'Wszystkie rzadkości',allGrade:'Wszystkie stany',general:'Rzadkość ogólna',kopicki:'Kopicki',unknown:'Nie ustalono'},en:{allRarity:'All rarities',allGrade:'All conditions',general:'General rarity',kopicki:'Kopicki',unknown:'Not determined'},de:{allRarity:'Alle Seltenheiten',allGrade:'Alle Erhaltungen',general:'Allgemeine Seltenheit',kopicki:'Kopicki',unknown:'Nicht bestimmt'},fr:{allRarity:'Toutes les raretés',allGrade:'Tous les états',general:'Rareté générale',kopicki:'Kopicki',unknown:'Non déterminé'}};
  const t=k=>labels[lang()]?.[k]||labels.en[k]||labels.pl[k]||k;
  const optionLabel=v=>v==='Nie ustalono'?t('unknown'):v;
  function rarityKey(c){
    const d=c?.detail&&typeof c.detail==='object'?c.detail:{};
    const status=String(d.catalogEvidenceStatus||c?.catalogEvidenceStatus||'').trim();
    if(status==='supported-by-stage2-variant-evidence'){
      const kr=normalized(c?.kopickiRarity||d.kopickiRarity);if(kr&&kr!=='Nie ustalono')return `kopicki:${kr}`;
    }
    const general=normalized(c?.rarityGeneral||c?.rarity);return general?`general:${general}`:'';
  }
  function rarityOptionLabel(key){if(!key)return'';const i=key.indexOf(':'),kind=i>=0?key.slice(0,i):'general',value=i>=0?key.slice(i+1):key;return `${kind==='kopicki'?t('kopicki'):t('general')}: ${optionLabel(value)}`}
  function valuesFor(coins,key){const set=new Set();for(const c of coins){const v=normalized(c?.[key]);if(v)set.add(v)}return [...set].sort((a,b)=>a==='Nie ustalono'?1:b==='Nie ustalono'?-1:a.localeCompare(b,'pl'))}
  function rarityValues(coins){const set=new Set();for(const c of coins){const v=rarityKey(c);if(v)set.add(v)}return [...set].sort((a,b)=>a.localeCompare(b,'pl'))}
  function fill(){const coins=ApoMonet.load().coins||[],rv=rarity.value,gv=grade.value;rarity.innerHTML='';rarity.add(new Option(t('allRarity'),''));grade.innerHTML='';grade.add(new Option(t('allGrade'),''));rarityValues(coins).forEach(v=>rarity.add(new Option(rarityOptionLabel(v),v)));valuesFor(coins,'grade').forEach(v=>grade.add(new Option(optionLabel(v),v)));if([...rarity.options].some(o=>o.value===rv))rarity.value=rv;if([...grade.options].some(o=>o.value===gv))grade.value=gv}
  const originalFiltered=window.filtered;if(typeof originalFiltered==='function'){window.filtered=function(){const r=rarity.value,g=grade.value;return originalFiltered().filter(c=>(!r||rarityKey(c)===r)&&(!g||normalized(c.grade)===g))}}
  rarity.addEventListener('change',()=>window.render?.());grade.addEventListener('change',()=>window.render?.());fill();
  const originalRebuild=window.rebuildFilters;if(typeof originalRebuild==='function')window.rebuildFilters=function(){const x=originalRebuild.apply(this,arguments);fill();return x};
  ['languagechange','apo-language-changed','apomonet:language-change'].forEach(e=>addEventListener(e,()=>setTimeout(fill,0)));
 }
 document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init):init();
})();
