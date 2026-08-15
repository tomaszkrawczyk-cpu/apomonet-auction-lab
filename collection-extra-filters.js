(()=>{
 function init(){if(!location.pathname.endsWith('collection.html')||!window.ApoMonet)return;const bar=document.querySelector('.filters');if(!bar||document.getElementById('rarityFilter'))return;const rarity=document.createElement('select'),grade=document.createElement('select');rarity.id='rarityFilter';rarity.className='input';grade.id='gradeFilter';grade.className='input';bar.append(rarity,grade);
  function fill(){const coins=ApoMonet.load().coins||[],rv=rarity.value,gv=grade.value;rarity.innerHTML='<option value="">Wszystkie rzadkości</option>';grade.innerHTML='<option value="">Wszystkie stany</option>';[...new Set(coins.map(c=>String(c.rarity||'').trim()).filter(Boolean))].sort().forEach(v=>rarity.add(new Option(v,v)));[...new Set(coins.map(c=>String(c.grade||'').trim()).filter(Boolean))].sort().forEach(v=>grade.add(new Option(v,v)));if([...rarity.options].some(o=>o.value===rv))rarity.value=rv;if([...grade.options].some(o=>o.value===gv))grade.value=gv}
  const originalFiltered=window.filtered;if(typeof originalFiltered==='function'){window.filtered=function(){const r=rarity.value,g=grade.value;return originalFiltered().filter(c=>(!r||String(c.rarity||'')===r)&&(!g||String(c.grade||'')===g))}}
  rarity.addEventListener('change',()=>window.render?.());grade.addEventListener('change',()=>window.render?.());fill();
  const originalRebuild=window.rebuildFilters;if(typeof originalRebuild==='function')window.rebuildFilters=function(){const x=originalRebuild.apply(this,arguments);fill();return x};
 }
 document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init):init();
})();
