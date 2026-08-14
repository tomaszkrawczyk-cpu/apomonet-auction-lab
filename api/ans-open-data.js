function clean(v){return String(v??'').trim()}
function label(v){if(!v)return'';if(typeof v==='string')return v;if(Array.isArray(v)){const x=v.find(a=>a?.['@language']==='en')||v[0];return x?.['@value']||x?.value||''}return v?.['@value']||v?.value||''}
module.exports=async function handler(req,res){
 if(req.method!=='GET')return res.status(405).json({ok:false,error:'GET only'});
 if(String(req.query?.health||'')==='1')return res.status(200).json({ok:true,source:'American Numismatic Society',mode:'OPEN_DATA_SINGLE_RECORD',dataLicense:'Open Database License',imagePolicy:'public-domain images only; no image stored by this endpoint'});
 const id=clean(req.query?.id).replace(/^.*\/id\//,'').replace(/\.jsonld$/,'');
 if(!/^[A-Za-z0-9._()\-]+$/.test(id))return res.status(400).json({ok:false,error:'Nieprawidłowy ANS record ID.'});
 try{
  const url=`https://numismatics.org/search/id/${encodeURIComponent(id)}.jsonld`,r=await fetch(url,{headers:{Accept:'application/ld+json'}});if(!r.ok)throw Error(`ANS ${r.status}`);const j=await r.json(),nodes=Array.isArray(j)?j:(j['@graph']||[j]),n=nodes.find(x=>String(x?.['@id']||'').includes('/id/'+id))||nodes[0]||{};
  const pref=n['http://www.w3.org/2004/02/skos/core#prefLabel']||n['http://purl.org/dc/terms/title']||n['http://www.w3.org/2000/01/rdf-schema#label'];
  return res.status(200).json({ok:true,item:{source:'ANS',id,uri:`https://numismatics.org/search/id/${id}`,label:label(pref)||id,conceptType:Array.isArray(n['@type'])?n['@type'].join(', '):(n['@type']||'numismatic object'),provider:'American Numismatic Society',rightsStatement:'ANS data: Open Database License; image rights evaluated separately',license:'ODbL',fetchedAt:new Date().toISOString()}});
 }catch(e){return res.status(422).json({ok:false,error:e.message})}
};