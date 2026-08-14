const BASE='https://nomisma.org';
function clean(v){return String(v??'').trim()}
module.exports=async function handler(req,res){
 res.setHeader('Cache-Control','s-maxage=86400, stale-while-revalidate=604800');
 if(req.method!=='GET')return res.status(405).json({ok:false,error:'GET only'});
 const id=clean(req.query?.id).replace(/^https?:\/\/nomisma\.org\/id\//,'').replace(/[^a-zA-Z0-9_.-]/g,'');
 if(!id)return res.status(200).json({ok:true,source:'nomisma',mode:'OPEN_KNOWLEDGE_SINGLE_ID',usage:'?id=<nomisma id>',license:'CC BY 3.0 unless specified otherwise',storesImages:false});
 try{
  const url=`${BASE}/id/${encodeURIComponent(id)}.jsonld`;
  const r=await fetch(url,{headers:{Accept:'application/ld+json, application/json'}});if(!r.ok)throw Error(`Nomisma ${r.status}`);const j=await r.json();
  const graph=Array.isArray(j['@graph'])?j['@graph']:[j];const node=graph.find(x=>String(x['@id']||'').endsWith('/id/'+id))||graph[0]||{};
  const label=node['skos:prefLabel']||node['http://www.w3.org/2004/02/skos/core#prefLabel']||node.label||id;
  const val=Array.isArray(label)?label[0]:label;const text=typeof val==='object'?(val['@value']||id):String(val||id);
  return res.status(200).json({ok:true,record:{source:'nomisma',sourceId:id,sourceUrl:`${BASE}/id/${id}`,license:'CC BY 3.0 unless record specifies otherwise',coin:{ruler:'',denomination:'',year:'',mint:'',metal:'',weight:null,diameter:null,variant:text},image:null,notes:'Normalized Nomisma identifier/label. Attribution and source URL retained.'},rawType:node['@type']||null});
 }catch(e){return res.status(422).json({ok:false,error:e.message})}
};