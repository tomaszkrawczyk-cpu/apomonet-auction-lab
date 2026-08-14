module.exports=async function handler(req,res){
 if(req.method!=='GET')return res.status(405).json({ok:false,error:'GET only'});
 const env={openai:!!process.env.OPENAI_API_KEY?.trim(),smithsonian:!!process.env.SMITHSONIAN_API_KEY?.trim(),europeana:!!process.env.EUROPEANA_API_KEY?.trim()};
 return res.status(env.openai?200:503).json({ok:env.openai,app:'APOMONET',environment:'production-capable',keys:{openai:env.openai,smithsonian:env.smithsonian,europeana:env.europeana},features:{analysis:true,smithsonianReference:env.smithsonian,europeanaOpenData:env.europeana},node:process.version});
}
