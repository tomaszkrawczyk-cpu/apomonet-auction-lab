(()=>{
  const norm=s=>String(s??'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
  const day=v=>{const d=new Date(v);return Number.isNaN(d.getTime())?'':d.toISOString().slice(0,10)};
  const price=r=>Number(r?.hammerPrice||r?.realizedPrice||r?.totalPrice||r?.price)||0;
  const basis=r=>window.ApoArchive?.priceBasis?.(r)||r?.priceType||'';
  function fingerprint(r={}){return [day(r.soldAt),norm(r.auctionHouse||r.sourceLabel||r.source),norm(r.ruler),norm(r.nominal),String(r.year||''),norm(r.mint),norm(r.variant),norm(r.kopickiReference||r.catalog),basis(r),String(price(r))].join('|')}
  function dedupe(rows=[]){const groups=new Map();for(const r of rows){const key=fingerprint(r);if(!key||key.split('|').filter(Boolean).length<5){groups.set(`id:${r.id||Math.random()}`,[r]);continue}(groups.get(key)||groups.set(key,[]).get(key)).push(r)}const kept=[],duplicates=[];for(const group of groups.values()){if(group.length===1){kept.push(group[0]);continue}const ranked=[...group].sort((a,b)=>(b.evidenceQualityScore||0)-(a.evidenceQualityScore||0)||Number(!!b.sourceUrl)-Number(!!a.sourceUrl));kept.push({...ranked[0],duplicateSourceCount:group.length,duplicateRecordIds:group.slice(1).map(x=>x.id)});duplicates.push(...ranked.slice(1).map(x=>({...x,duplicateOf:ranked[0].id}))) }return{rows:kept,duplicates,removedCount:duplicates.length}}
  window.ApoAuctionDedup={fingerprint,dedupe};
})();
