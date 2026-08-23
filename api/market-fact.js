module.exports=async function handler(req,res){
  const payload={
    ok:false,
    enabled:false,
    adapter:'WCN_DIRECT_RECORDS',
    code:'SOURCE_AUTOMATION_NOT_APPROVED',
    error:'Automatyczne pobieranie danych z WCN jest wyłączone do czasu odrębnej zgody lub potwierdzonej podstawy prawnej. Dodaj fakt cenowy ręcznie i zachowaj bezpośredni link do źródła.'
  };
  if(req.method==='GET'&&String(req.query?.health||'')==='1')return res.status(200).json({...payload,ok:true});
  if(!['POST','GET'].includes(req.method))return res.status(405).json({error:'Method not allowed'});
  return res.status(403).json(payload);
}
