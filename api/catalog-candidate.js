const textFrom=(data)=>{let t=data?.output_text||'';for(const item of data?.output||[])for(const p of item?.content||[])if(p?.type==='output_text')t+=p.text||'';return t};
const clean=v=>String(v??'').trim();
export default async function handler(req,res){
  if(req.method!=='POST')return res.status(405).json({error:'POST only'});
  const key=process.env.OPENAI_API_KEY?.trim();if(!key)return res.status(500).json({error:'Brak OPENAI_API_KEY'});
  const body=req.body||{},base=body.base&&typeof body.base==='object'?body.base:{},detail=body.detail&&typeof body.detail==='object'?body.detail:{},images=Array.isArray(body.images)?body.images.filter(x=>typeof x==='string'&&x.startsWith('data:image/')).slice(0,2):[];
  const content=[{type:'input_text',text:`Jesteś numizmatykiem katalogowym APOMONET. Twoim JEDYNYM zadaniem jest ocenić, czy dla tej monety sensownie stosuje się katalog Kopickiego i jeśli tak wskazać najlepszego kandydata. Nie zgaduj. Dane bazowe: ${JSON.stringify(base)}. Dane z analizy szczegółowej: ${JSON.stringify({variant:detail.variant,obverseLegend:detail.obverseLegend,reverseLegend:detail.reverseLegend,visibleDateReading:detail.visibleDateReading,diagnosticFeatures:detail.diagnosticFeatures,mintmaster:detail.mintmaster,legendPunctuation:detail.legendPunctuation})}. Jeśli to moneta spoza polskiego/ziem polskich zakresu katalogowego, ustaw applicable=false. Jeśli katalog ma zastosowanie, ale nie możesz obronić dokładnego numeru, ustaw applicable=true, candidateReference pusty i wyjaśnij brak podstaw. Rzadkość R/R1-R8 podawaj tylko gdy naprawdę wynika z właściwej pozycji katalogowej. Zwróć zwięzłą podstawę identyfikacji.`}];
  for(const image of images)content.push({type:'input_image',image_url:image,detail:'high'});
  const schema={type:'object',additionalProperties:false,properties:{applicable:{type:'boolean'},candidateReference:{type:'string'},candidateRarity:{type:'string'},confidence:{type:'integer',minimum:0,maximum:95},basis:{type:'string'},warnings:{type:'array',items:{type:'string'}}},required:['applicable','candidateReference','candidateRarity','confidence','basis','warnings']};
  const r=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${key}`},body:JSON.stringify({model:'gpt-5.6',reasoning:{effort:'low'},input:[{role:'user',content}],text:{format:{type:'json_schema',name:'kopicki_candidate_v1',strict:true,schema}}})});
  const data=await r.json();if(!r.ok)return res.status(r.status).json({error:data?.error?.message||'Błąd analizy katalogowej'});
  const txt=textFrom(data);if(!txt)return res.status(502).json({error:'Pusty wynik katalogowy'});
  const out=JSON.parse(txt);out.candidateReference=clean(out.candidateReference);out.candidateRarity=clean(out.candidateRarity).toUpperCase().replace(/\s+/g,'');out.confidence=Math.min(95,Number(out.confidence)||0);
  return res.status(200).json({candidate:out});
}
