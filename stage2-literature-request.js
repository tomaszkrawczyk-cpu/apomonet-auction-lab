(()=>{
  if(!location.pathname.endsWith('analyze.html'))return;
  const nativeFetch=window.fetch.bind(window);
  window.fetch=async function(input,init={}){
    const url=typeof input==='string'?input:String(input?.url||'');
    if(url!=='/api/analyze-detail')return nativeFetch(input,init);
    let body={};
    try{body=JSON.parse(init?.body||'{}')}catch{}
    const base=body?.base||{};
    const policy=window.ApoCatalogLiteraturePolicy?.select?.(base)||null;
    const next={...body,literaturePolicy:policy,stage2Explicit:true};
    return nativeFetch(input,{...init,body:JSON.stringify(next)});
  };
})();
