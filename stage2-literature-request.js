(()=>{
  if(!location.pathname.endsWith('analyze.html'))return;
  const loadUi=()=>{if(document.querySelector('script[data-apo-stage2-literature-ui]'))return;const s=document.createElement('script');s.src='stage2-literature-ui.js';s.dataset.apoStage2LiteratureUi='1';document.head.appendChild(s)};
  const loadProfessionalUi=()=>{if(document.querySelector('script[data-apo-stage2-professional-ui]'))return;const s=document.createElement('script');s.src='stage2-professional-description-ui.js';s.dataset.apoStage2ProfessionalUi='1';document.head.appendChild(s)};
  loadUi();loadProfessionalUi();
  const nativeFetch=window.fetch.bind(window);
  window.fetch=async function(input,init={}){
    const url=typeof input==='string'?input:String(input?.url||'');
    if(url!=='/api/analyze-detail')return nativeFetch(input,init);
    let body={};
    try{body=JSON.parse(init?.body||'{}')}catch{}
    const base=body?.base||{};
    const policy=window.ApoCatalogLiteraturePolicy?.select?.(base)||null;
    const next={...body,literaturePolicy:policy,stage2Explicit:true};
    const response=await nativeFetch(input,{...init,body:JSON.stringify(next)});
    try{
      const data=await response.clone().json();
      const d=data?.detail||{};
      const refs=[];
      const add=(id,label,value,extra={})=>{if(value!==undefined&&value!==null&&String(value).trim()!=='')refs.push({id,label,value:String(value).trim(),...extra})};
      add('kopicki','Kopicki',d.kopickiReference||d.kopicki||d.catalogReference,d.kopickiRarity?{rarity:d.kopickiRarity}:{});
      add('tyszkiewicz','Tyszkiewicz',d.tyszkiewiczReference||d.tyszkiewiczValue,d.tyszkiewiczValue?{historicalValue:String(d.tyszkiewiczValue)}:{});
      add('parchimowicz','Parchimowicz',d.parchimowiczReference||d.parchimowicz);
      for(const r of d.specialistReferences||[])if(r?.label&&r?.value)refs.push({id:r.id||String(r.label).toLowerCase(),label:String(r.label),value:String(r.value),source:r.source||''});
      window.__apoConfirmedStage2Literature={references:refs,receivedAt:new Date().toISOString()};
      window.__apoStage2Detail=d;
      window.__apoStage2Base=base;
      window.dispatchEvent(new CustomEvent('apo-stage2-literature',{detail:window.__apoConfirmedStage2Literature}));
      window.dispatchEvent(new CustomEvent('apo-stage2-detail',{detail:{base,detail:d,literature:window.__apoConfirmedStage2Literature}}));
    }catch{}
    return response;
  };
})();
