(()=>{
  if(!location.pathname.endsWith('analyze.html'))return;
  const loadUi=()=>{if(document.querySelector('script[data-apo-stage2-literature-ui]'))return;const s=document.createElement('script');s.src='stage2-literature-ui.js';s.dataset.apoStage2LiteratureUi='1';document.head.appendChild(s)};
  const loadProfessionalUi=()=>{if(document.querySelector('script[data-apo-stage2-professional-ui]'))return;const s=document.createElement('script');s.src='stage2-professional-description-ui.js';s.dataset.apoStage2ProfessionalUi='1';document.head.appendChild(s)};
  loadUi();loadProfessionalUi();
  const nativeFetch=window.fetch.bind(window);
  const norm=v=>String(v??'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ł/g,'l');
  const unknownPatterns=[/^nie\s+ustalono$/,/^nieokreslona?$/,/^brak$/,/^do\s+potwierdzenia$/,/^not\s+determined$/,/^undetermined$/,/^unknown$/,/^to\s+be\s+confirmed$/,/^nicht\s+bestimmt$/,/^unbekannt$/,/^zu\s+bestatigen$/,/^non\s+determinee?$/,/^inconnu(?:e)?$/,/^a\s+confirmer$/];
  const canonical=v=>{const n=norm(v);return !n||unknownPatterns.some(r=>r.test(n))?'Nie ustalono':v};
  const canonicalBase=input=>{const base={...(input||{})};for(const k of ['country','ruler','year','nominal','mint','metal','variant'])if(k in base)base[k]=canonical(base[k]);return base};
  window.fetch=async function(input,init={}){
    const url=typeof input==='string'?input:String(input?.url||'');
    if(url!=='/api/analyze-detail')return nativeFetch(input,init);
    let body={};
    try{body=JSON.parse(init?.body||'{}')}catch{}
    const base=canonicalBase(body?.base||{});
    const policy=window.ApoCatalogLiteraturePolicy?.select?.(base)||null;
    const next={...body,base,literaturePolicy:policy,stage2Explicit:true};
    const response=await nativeFetch(input,{...init,body:JSON.stringify(next)});
    try{
      const data=await response.clone().json();
      const d=data?.detail||{};
      const refs=[];
      const allowed=new Set((policy?.references||[]).map(r=>String(r?.id||'').toLowerCase()).filter(Boolean));
      const add=(id,label,value,extra={})=>{const key=String(id||'').toLowerCase();if(!allowed.has(key))return;if(value!==undefined&&value!==null&&String(value).trim()!=='')refs.push({id:key,label,value:String(value).trim(),...extra})};
      add('kopicki','Kopicki',d.kopickiReference||d.kopicki||d.catalogReference,d.kopickiRarity?{rarity:d.kopickiRarity}:{});
      add('tyszkiewicz','Tyszkiewicz',d.tyszkiewiczReference||d.tyszkiewiczValue,d.tyszkiewiczValue?{historicalValue:String(d.tyszkiewiczValue),historicalValueOnly:true}:{});
      add('parchimowicz','Parchimowicz',d.parchimowiczReference||d.parchimowicz);
      for(const r of d.specialistReferences||[]){const key=String(r?.id||r?.label||'').toLowerCase();if(allowed.has(key)&&r?.label&&r?.value)refs.push({id:key,label:String(r.label),value:String(r.value),source:r.source||''})}
      window.__apoConfirmedStage2Literature={references:refs,receivedAt:new Date().toISOString(),policyMethod:policy?.method||'evidence-based'};
      window.__apoStage2Detail=d;
      window.__apoStage2Base=base;
      window.dispatchEvent(new CustomEvent('apo-stage2-literature',{detail:window.__apoConfirmedStage2Literature}));
      window.dispatchEvent(new CustomEvent('apo-stage2-detail',{detail:{base,detail:d,literature:window.__apoConfirmedStage2Literature}}));
    }catch{}
    return response;
  };
})();
