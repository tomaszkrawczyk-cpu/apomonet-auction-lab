(()=>{
 function init(){if(!location.pathname.endsWith('collection.html')||!window.ApoMonet)return;const bar=document.querySelector('.filters');if(!bar||document.getElementById('rarityFilter'))return;const rarity=document.createElement('select'),grade=document.createElement('select');rarity.id='rarityFilter';rarity.className='input';grade.id='gradeFilter';grade.className='input';bar.append(rarity,grade);
  const sentinels=()=>window.ApoCanonicalRecordSentinels;
  const canonical=v=>sentinels()?.canonical?sentinels().canonical(v):String(v??'').trim();
  const normalized=v=>{const c=canonical(v);return c==='Nie ustalono'?'Nie ustalono':String(c||'').trim()};
  const labelUnknown=()=>window.ApoI18n?.current?.()==='en'?'Not determined':window.ApoI18n?.current?.()==='de'?'Nicht bestimmt':window.ApoI18n?.current?.()==='fr'?'Non déterminé':'Nie ustalono';
  function optionLabel(v){return v==='Nie ustalono'?labelUnknown():v}
  function valuesFor(coins,key){const set=new Set();for(const c of coins){const v=normalized(c?.[key]);if(v)set.add(v)}return [...set].sort((a,b)=>a==='Nie ustalono'?1:b==='Nie ustalono'?-1:a.localeCompare(b,'pl'))}
  function fill(){const coins=ApoMonet.load().coins||[],rv=rarity.value,gv=grade.value;rarity.innerHTML='<option value="">Wszystkie rzadkości</option>';grade.innerHTML='<option value="">Wszystkie stany</option>';valuesFor(coins,'rarity').forEach(v=>rarity.add(new Option(optionLabel(v),v)));valuesFor(coins,'grade').forEach(v=>grade.add(new Option(optionLabel(v),v)));if([...rarity.options].some(o=>o.value===rv))rarity.value=rv;if([...grade.options].some(o=>o.value===gv))grade.value=gv}
  const originalFiltered=window.filtered;if(typeof originalFiltered==='function'){window.filtered=function(){const r=rarity.value,g=grade.value;return originalFiltered().filter(c=>(!r||normalized(c.rarity)===r)&&(!g||normalized(c.grade)===g))}}
  rarity.addEventListener('change',()=>window.render?.());grade.addEventListener('change',()=>window.render?.());fill();
  const originalRebuild=window.rebuildFilters;if(typeof originalRebuild==='function')window.rebuildFilters=function(){const x=originalRebuild.apply(this,arguments);fill();return x};
  ['languagechange','apo-language-changed','apomonet:language-change'].forEach(e=>addEventListener(e,()=>setTimeout(fill,0)));
 }
 document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init):init();
})();
