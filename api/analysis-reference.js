function text(v){return String(v??'').trim()}
function norm(v){return text(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')}
function nominalForms(v){const x=norm(v);if(/dwutalar|2 talar/.test(x))return['2 taler','2 talar','dwutalar'];if(/talar/.test(x))return['taler','thaler','talar'];if(/dukat/.test(x))return['ducat','dukat'];if(/zlot/.test(x))return['zloty','zlote','zlotych'];if(/grosz|grosh/.test(x))return['grosz','grosh','groszy'];return x?[x]:[]}
function rulerForms(v){const x=norm(v),m=[['zygmunt i stary',['sigismund i','zygmunt i']],['zygmunt ii august',['sigismund ii','zygmunt ii']],['zygmunt iii waza',['sigismund iii','zygmunt iii']],['stefan batory',['stephen bathory','stefan batory']],['wladyslaw iv waza',['ladislaus iv','wladyslaw iv']],['jan ii kazimierz',['john ii casimir','jan ii kazimierz']],['jan iii sobieski',['john iii sobieski','jan iii sobieski']],['august ii',['augustus ii','august ii']],['august iii',['augustus iii','august iii']],['stanislaw august poniatowski',['stanislaus august poniatowski','stanislaw august poniatowski']]];for(const [k,a] of m)if(x.includes(k))return a;return x?[x]:[]}
module.exports=async function handler(req,res){
  const key=process.env.SMITHSONIAN_API_KEY?.trim();
  if(String(req.query?.health||'')==='1') return res.status(200).json({ok:true,source:'Smithsonian reference validator',keyConfigured:!!key,mode:'support_or_warn_only'});
  if(!['GET','POST'].includes(req.method)) return res.status(405).json({ok:false,error:'GET/POST only'});
  if(!key) return res.status(503).json({ok:false,error:'Reference source unavailable'});
  const a=req.method==='POST'?(req.body?.analysis||{}):req.query||{};
  const year=text(a.year), nominal=text(a.nominal), ruler=text(a.ruler), country=text(a.country)||'Poland';
  if(!/^\d{4}$/.test(year)||!nominal) return res.status(200).json({ok:true,status:'neutral',reason:'insufficient_identity',items:[]});
  const q=[country,nominalForms(nominal)[0]||nominal,year].filter(Boolean).join(' ');
  try{
    const url='https://api.si.edu/openaccess/api/v1.0/search?q='+encodeURIComponent(q)+'&rows=60&api_key='+encodeURIComponent(key);
    const response=await fetch(url);if(!response.ok)throw Error('Smithsonian '+response.status);const data=await response.json();
    const rows=(data?.response?.rows||[]).filter(x=>String(x?.unitCode||'').toUpperCase()==='NMAH').map(x=>({id:String(x.id||''),label:String(x.title||'')})).filter(x=>/coin|ducat|taler|thaler|zlot|gros|medal|token/i.test(x.label)&&!/catalog|catalogue|book|guide/i.test(x.label));
    const nfs=nominalForms(nominal),rfs=rulerForms(ruler);
    const ranked=rows.map(x=>{const z=norm(x.label);let score=0;if(z.includes(year))score+=4;if(nfs.some(t=>z.includes(norm(t))))score+=4;if(rfs.some(t=>z.includes(norm(t))))score+=3;if(z.includes('poland'))score+=2;return{...x,score}}).filter(x=>x.score>=6).sort((a,b)=>b.score-a.score).slice(0,5);
    if(!ranked.length)return res.status(200).json({ok:true,status:'neutral',reason:'no_reference_match',query:q,items:[]});
    const best=ranked[0],z=norm(best.label),yearSupported=z.includes(year),nominalSupported=nfs.some(t=>z.includes(norm(t))),rulerSupported=rfs.length?rfs.some(t=>z.includes(norm(t))):false;
    const status=yearSupported&&nominalSupported&&rulerSupported?'supported':yearSupported&&nominalSupported&&rfs.length&&!rulerSupported?'possible_conflict':'neutral';
    return res.status(200).json({ok:true,status,query:q,best,items:ranked,checks:{yearSupported,nominalSupported,rulerSupported},source:'Smithsonian National Numismatic Collection'});
  }catch(e){return res.status(200).json({ok:true,status:'neutral',reason:'reference_error',items:[]})}
}
