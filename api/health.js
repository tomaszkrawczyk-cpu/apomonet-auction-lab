module.exports=async function handler(req,res){
 if(req.method!=='GET')return res.status(405).json({ok:false,error:'GET only'});
 res.setHeader('Cache-Control','no-store, max-age=0');
 const openai=!!process.env.OPENAI_API_KEY?.trim(),siKey=process.env.SMITHSONIAN_API_KEY?.trim()||'',euKey=process.env.EUROPEANA_API_KEY?.trim()||'';
 async function verifySmithsonian(){if(!siKey)return false;try{const r=await fetch('https://api.si.edu/openaccess/api/v1.0/search?q=coin&rows=1&api_key='+encodeURIComponent(siKey));return r.ok}catch{return false}}
 async function verifyEuropeana(){if(!euKey)return false;try{const r=await fetch('https://api.europeana.eu/record/v2/search.json?query=coin&rows=1&wskey='+encodeURIComponent(euKey));const j=await r.json();return r.ok&&j?.success!==false}catch{return false}}
 const [smithsonianValid,europeanaValid]=await Promise.all([verifySmithsonian(),verifyEuropeana()]);
 const ok=openai;
 return res.status(ok?200:503).json({ok,app:'APOMONET',environment:'production-capable',keys:{openaiConfigured:openai,smithsonianConfigured:!!siKey,europeanaConfigured:!!euKey},checks:{smithsonianValid,europeanaValid},features:{analysis:openai,smithsonianReference:smithsonianValid,europeanaOpenData:europeanaValid},node:process.version});
}
