export default async function handler(req,res){
 if(req.method!=='GET')return res.status(405).json({error:'Dozwolona jest tylko metoda GET.'});
 res.setHeader('Cache-Control','no-store, max-age=0');
 try{
  const key=process.env.EUROPEANA_API_KEY?.trim();
  if(String(req.query?.health||'')==='1'){
   if(!key)return res.status(200).json({success:true,configured:false,valid:false,adapter:'EUROPEANA_RECORD_API_V2',metadataLicense:'CC0',mediaRequiresOpenRights:true});
   if(String(req.query?.verify||'')!=='1')return res.status(200).json({success:true,configured:true,valid:null,adapter:'EUROPEANA_RECORD_API_V2',metadataLicense:'CC0',mediaRequiresOpenRights:true});
   try{
    const testUrl='https://api.europeana.eu/record/v2/search.json?query=coin&rows=1&wskey='+encodeURIComponent(key);
    const vr=await fetch(testUrl,{headers:{Accept:'application/json'}}),vj=await vr.json();
    const valid=vr.ok&&vj?.success!==false;
    return res.status(200).json({success:true,configured:true,valid,status:vr.status,adapter:'EUROPEANA_RECORD_API_V2',metadataLicense:'CC0',mediaRequiresOpenRights:true,error:valid?undefined:(vj?.error||vj?.message||vj?.code||'Europeana odrzuciła klucz.')});
   }catch(e){return res.status(200).json({success:true,configured:true,valid:false,status:null,adapter:'EUROPEANA_RECORD_API_V2',error:'Nie udało się zweryfikować klucza Europeana.'})}
  }
  if(!key)return res.status(503).json({error:'Brak EUROPEANA_API_KEY. Adapter jest gotowy, ale wymaga działającego klucza Europeana.'});
  const raw=String(req.query?.id||'').trim();
  const id=raw.replace(/^https?:\/\/www\.europeana\.eu\/[^/]+\/item\//,'/').replace(/^https?:\/\/www\.europeana\.eu\/item\//,'/');
  if(!/^\/\d+\/.+/.test(id))return res.status(400).json({error:'Podaj Europeana ID w formacie /DATASET_ID/LOCAL_ID.'});
  const url='https://api.europeana.eu/record/v2'+id+'.json?wskey='+encodeURIComponent(key);
  const r=await fetch(url,{headers:{Accept:'application/json'}}),j=await r.json();
  if(!r.ok||j?.success===false)return res.status(r.status||502).json({error:j?.error||j?.message||'Błąd Europeana Record API.'});
  const o=j.object||{},first=x=>Array.isArray(x)?String(x[0]??''):String(x??''),langFirst=x=>{if(!x)return'';if(typeof x==='string')return x;if(Array.isArray(x))return first(x);for(const k of ['pl','en','def'])if(x[k])return first(x[k]);return first(Object.values(x)[0])};
  const rights=[];for(const a of [...(o.aggregations||[]),...(o.europeanaAggregation||[])]){const v=a?.edmRights||a?.edmrights;if(typeof v==='string')rights.push(v);else if(Array.isArray(v))rights.push(...v.map(String));else if(v&&typeof v==='object')for(const x of Object.values(v))Array.isArray(x)?rights.push(...x.map(String)):rights.push(String(x))}
  const unique=[...new Set(rights.filter(Boolean))],open=/creativecommons\.org\/(publicdomain|licenses\/(by|by-sa)\/)|rightsstatements\.org\/vocab\/NoC-/i.test(unique.join(' '));
  const provider=first(o.provider)||langFirst(o.aggregations?.[0]?.edmDataProvider)||langFirst(o.aggregations?.[0]?.edmProvider);
  const item={source:'EUROPEANA',id:o.about||id,uri:'https://www.europeana.eu/item'+id,label:first(o.title)||id,conceptType:first(o.type),year:first(o.year),provider,rightsStatement:unique.join(' | '),license:'METADATA_CC0',mediaReusable:open,fetchedAt:new Date().toISOString()};
  return res.status(200).json({success:true,item});
 }catch(e){console.error(e);return res.status(500).json({error:e?.message||'Wewnętrzny błąd adaptera Europeana.'})}
}
