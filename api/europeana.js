export default async function handler(req,res){
 if(req.method!=='GET')return res.status(405).json({error:'Dozwolona jest tylko metoda GET.'});
 try{
  const key=process.env.EUROPEANA_API_KEY?.trim();
  if(String(req.query?.health||'')==='1')return res.status(200).json({success:true,configured:!!key,adapter:'EUROPEANA_RECORD_API_V2',metadataLicense:'CC0',mediaRequiresOpenRights:true});
  if(!key)return res.status(503).json({error:'Brak EUROPEANA_API_KEY. Adapter jest gotowy, ale wymaga klucza projektu Europeana.'});
  const raw=String(req.query?.id||'').trim();
  const id=raw.replace(/^https?:\/\/www\.europeana\.eu\/[^/]+\/item\//,'/').replace(/^https?:\/\/www\.europeana\.eu\/item\//,'/');
  if(!/^\/\d+\/.+/.test(id))return res.status(400).json({error:'Podaj Europeana ID w formacie /DATASET_ID/LOCAL_ID.'});
  const url='https://api.europeana.eu/record/v2'+id+'.json?wskey='+encodeURIComponent(key);
  const r=await fetch(url,{headers:{Accept:'application/json'}}),j=await r.json();
  if(!r.ok||j?.success===false)return res.status(r.status||502).json({error:j?.error||'Błąd Europeana Record API.'});
  const o=j.object||{},first=x=>Array.isArray(x)?String(x[0]??''):String(x??''),langFirst=x=>{if(!x)return'';if(typeof x==='string')return x;if(Array.isArray(x))return first(x);for(const k of ['pl','en','def'])if(x[k])return first(x[k]);return first(Object.values(x)[0])};
  const rights=[];for(const a of [...(o.aggregations||[]),...(o.europeanaAggregation||[])]){const v=a?.edmRights||a?.edmrights;if(typeof v==='string')rights.push(v);else if(Array.isArray(v))rights.push(...v.map(String));else if(v&&typeof v==='object')for(const x of Object.values(v))Array.isArray(x)?rights.push(...x.map(String)):rights.push(String(x))}
  const unique=[...new Set(rights.filter(Boolean))],open=/creativecommons\.org\/(publicdomain|licenses\/(by|by-sa)\/)|rightsstatements\.org\/vocab\/NoC-/i.test(unique.join(' '));
  const provider=first(o.provider)||langFirst(o.aggregations?.[0]?.edmDataProvider)||langFirst(o.aggregations?.[0]?.edmProvider);
  const item={source:'EUROPEANA',id:o.about||id,uri:'https://www.europeana.eu/item'+id,label:first(o.title)||id,conceptType:first(o.type),year:first(o.year),provider,rightsStatement:unique.join(' | '),license:'METADATA_CC0',mediaReusable:open,fetchedAt:new Date().toISOString()};
  return res.status(200).json({success:true,item});
 }catch(e){console.error(e);return res.status(500).json({error:e?.message||'Wewnętrzny błąd adaptera Europeana.'})}
}