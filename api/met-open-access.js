const MET='https://collectionapi.metmuseum.org/public/collection/v1';

function clean(v){return String(v??'').trim()}
function coinLike(o){
 const hay=[o.title,o.objectName,o.classification,o.medium,o.tags?.map(x=>x.term).join(' ')].filter(Boolean).join(' ').toLowerCase();
 return /coin|medal|numismatic|currency|token/.test(hay);
}
function normalize(o){
 if(!o?.objectID) throw Error('Invalid Met object');
 if(!o.isPublicDomain) throw Error('Met object is not marked Public Domain');
 if(!coinLike(o)) throw Error('Met object is not numismatic enough for automatic ingestion');
 return {
  source:'met',sourceId:String(o.objectID),sourceUrl:o.objectURL||`https://www.metmuseum.org/art/collection/search/${o.objectID}`,
  license:'CC0 / Public Domain (object flagged isPublicDomain by The Met)',
  coin:{
   ruler:clean(o.artistDisplayName),denomination:clean(o.objectName||o.title),year:clean(o.objectDate),mint:clean(o.city||o.country||o.culture),metal:clean(o.medium),weight:null,diameter:null,variant:clean(o.title)
  },
  image:o.primaryImage?{open:true,url:o.primaryImage,small:o.primaryImageSmall||null,rights:'Public Domain / The Met Open Access'}:null,
  notes:'Normalized from The Met Open Access API; no catalogue prose stored.'
 };
}
module.exports=async function handler(req,res){
 res.setHeader('Cache-Control','s-maxage=86400, stale-while-revalidate=604800');
 if(req.method!=='GET') return res.status(405).json({ok:false,error:'GET only'});
 const id=String(req.query?.id||'').replace(/\D/g,'');
 const q=clean(req.query?.q);
 try{
  if(id){const r=await fetch(`${MET}/objects/${id}`);if(!r.ok)throw Error(`Met ${r.status}`);return res.status(200).json({ok:true,record:normalize(await r.json())});}
  if(!q)return res.status(200).json({ok:true,source:'met',mode:'OPEN_ACCESS_SINGLE_OBJECT',usage:'?id=<Met object id> or ?q=<search>',storesCatalogueProse:false,requiresPublicDomain:true});
  const r=await fetch(`${MET}/search?hasImages=true&q=${encodeURIComponent(q)}`);if(!r.ok)throw Error(`Met search ${r.status}`);const j=await r.json();
  return res.status(200).json({ok:true,total:j.total||0,objectIDs:(j.objectIDs||[]).slice(0,20)});
 }catch(e){return res.status(422).json({ok:false,error:e.message})}
};