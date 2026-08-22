(()=>{
 const norm=s=>String(s??'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
 const day=v=>{const d=new Date(v);return Number.isNaN(d.getTime())?'':d.toISOString().slice(0,10)};
 const amount=(r,k)=>Number(r?.[k])||0;
 function saleKey(r={}){return[day(r.soldAt),norm(r.auctionHouse||r.sourceLabel||r.source),norm(r.ruler),norm(r.nominal),String(r.year||''),norm(r.mint),norm(r.variant),norm(r.kopickiReference||r.catalog)].join('|')}
 function compare(group=[]){if(group.length<2)return{conflict:false,fields:[]};const fields=[];for(const k of ['hammerPrice','realizedPrice','totalPrice']){const vals=[...new Set(group.map(r=>amount(r,k)).filter(Boolean))];if(vals.length>1)fields.push(k)}const bases=[...new Set(group.map(r=>window.ApoArchive?.priceBasis?.(r)||r.priceType||'').filter(Boolean))];if(bases.length>1)fields.push('priceBasis');const currencies=[...new Set(group.map(r=>String(r.currency||'').toUpperCase()).filter(Boolean))];if(currencies.length>1)fields.push('currency');return{conflict:fields.length>0,fields}}
 function inspect(rows=[]){const groups=new Map();for(const r of rows){const k=saleKey(r);(groups.get(k)||groups.set(k,[]).get(k)).push(r)}const conflicts=[];for(const [key,group] of groups)if(group.length>1){const c=compare(group);if(c.conflict)conflicts.push({key,records:group,fields:c.fields})}return conflicts}
 window.ApoAuctionSourceConflict={saleKey,compare,inspect};
})();