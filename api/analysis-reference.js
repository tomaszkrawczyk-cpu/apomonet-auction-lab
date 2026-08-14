function text(v){return String(v??'').trim()}
function norm(v){return text(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')}
module.exports=async function handler(req,res){
  if(req.method!=='POST') return res.status(405).json({ok:false,error:'POST only'});
  const key=process.env.SMITHSONIAN_API_KEY?.trim();
  if(!key) return res.status(503).json({ok:false,error:'Reference source unavailable'});
  const a=req.body?.analysis||{};
  const year=text(a.year), nominal=text(a.nominal), ruler=text(a.ruler), country=text(a.country)||'Poland';
  if(!/^\d{4}$/.test(year)||!nominal) return res.status(200).json({ok:true,status:'neutral',reason:'insufficient_identity',items:[]});
  const q=[country,nominal,year].filter(Boolean).join(' ');
  try{
    const url='https://api.si.edu/openaccess/api/v1.0/search?q='+encodeURIComponent(q)+'&rows=40&api_key='+encodeURIComponent(key);
    const response=await fetch(url);
    if(!response.ok) throw Error('Smithsonian '+response.status);
    const data=await response.json();
    const rows=(data?.response?.rows||[]).filter(x=>String(x?.unitCode||'').toUpperCase()==='NMAH').map(x=>({id:String(x.id||''),label:String(x.title||'')})).filter(x=>/coin|ducat|taler|thaler|zlot|gros|medal|token/i.test(x.label)&&!/catalog|catalogue|book|guide/i.test(x.label));
    const nNom=norm(nominal),nRuler=norm(ruler);
    const ranked=rows.map(x=>{const z=norm(x.label);let score=0;if(z.includes(year))score+=4;if(nNom&&z.includes(nNom))score+=4;if(nRuler&&z.includes(nRuler))score+=3;if(z.includes('poland'))score+=2;return{...x,score}}).filter(x=>x.score>=4).sort((a,b)=>b.score-a.score).slice(0,5);
    if(!ranked.length) return res.status(200).json({ok:true,status:'neutral',reason:'no_reference_match',items:[]});
    const best=ranked[0],z=norm(best.label),yearSupported=z.includes(year),nominalSupported=nNom?z.includes(nNom):false,rulerSupported=nRuler?z.includes(nRuler):false;
    const status=yearSupported&&nominalSupported&&rulerSupported?'supported':yearSupported&&nominalSupported&&nRuler&&!rulerSupported?'possible_conflict':'neutral';
    return res.status(200).json({ok:true,status,best,items:ranked,checks:{yearSupported,nominalSupported,rulerSupported},source:'Smithsonian National Numismatic Collection'});
  }catch(e){return res.status(200).json({ok:true,status:'neutral',reason:'reference_error',items:[]})}
}
