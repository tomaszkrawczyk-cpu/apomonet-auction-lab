(()=>{
  if(!location.pathname.endsWith('analyze.html'))return;
  const LANG_KEY='apomonet_language_v2';
  const supported=new Set(['en','de','fr']);
  const nativeFetch=window.fetch.bind(window);
  const originals=new WeakMap();
  let maps=new Map(),basicPayload=null,detailPayload=null,seq=0;
  const lang=()=>window.ApoLanguageRegistry?.current?.()||window.ApoI18n?.current?.()||localStorage.getItem(LANG_KEY)||'pl';
  const clean=v=>String(v??'').trim();
  const add=(items,key,value)=>{const text=clean(value);if(text)items.push({key,text})};
  function itemsFrom(kind,data){
    const items=[];
    if(kind==='analysis'){
      for(const k of ['title','country','ruler','nominal','metal','mint','variant','grade','rarity','imageQualityNote','denominationEvidence','valuationNote','description','fullDescription'])add(items,k,data?.[k]);
      (data?.warnings||[]).slice(0,4).forEach((v,i)=>add(items,`warnings.${i}`,v));
      (data?.followUpQuestions||[]).slice(0,3).forEach((v,i)=>add(items,`followUpQuestions.${i}`,v));
    }else{
      for(const k of ['variant','kopickiRarity','obverseDetails','reverseDetails','legendPunctuation','fullDescription'])add(items,`detail.${k}`,data?.[k]);
      (data?.warnings||[]).slice(0,4).forEach((v,i)=>add(items,`detail.warnings.${i}`,v));
      (data?.diagnosticFeatures||[]).slice(0,16).forEach((v,i)=>add(items,`detail.diagnosticFeatures.${i}`,v));
    }
    return items;
  }
  function restore(){
    document.querySelectorAll('body *').forEach(el=>{for(const n of el.childNodes){if(n.nodeType===Node.TEXT_NODE&&originals.has(n))n.nodeValue=originals.get(n)}});
  }
  function apply(){
    const l=lang();
    if(l==='pl'){restore();return}
    if(!maps.size)return;
    const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n;
    while(n=walker.nextNode()){
      if(!n.parentElement||['SCRIPT','STYLE'].includes(n.parentElement.tagName))continue;
      if(!originals.has(n))originals.set(n,n.nodeValue);
      const raw=originals.get(n),trim=clean(raw),translated=maps.get(trim);
      if(translated)n.nodeValue=raw.replace(trim,translated);
    }
  }
  async function translate(kind,payload){
    const l=lang();if(!supported.has(l)||!payload)return;
    const items=itemsFrom(kind,payload);if(!items.length)return;
    const token=++seq;
    try{
      const r=await nativeFetch('/api/translate-analysis',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({language:l,items})});
      if(!r.ok||token!==seq&&kind==='analysis')return;
      const out=await r.json(),byKey=out?.translations||{};
      for(const item of items){const translated=clean(byKey[item.key]);if(translated)maps.set(item.text,translated)}
      apply();
      window.dispatchEvent(new CustomEvent('apo:analysis-ai-translated',{detail:{language:l,kind}}));
    }catch{}
  }
  window.fetch=async function(input,init){
    const url=typeof input==='string'?input:String(input?.url||'');
    const response=await nativeFetch(input,init);
    if(response.ok&&(url==='/api/analyze'||url==='/api/analyze-detail')){
      try{
        const json=await response.clone().json();
        if(url==='/api/analyze'&&json?.analysis){basicPayload=json.analysis;setTimeout(()=>translate('analysis',basicPayload),0)}
        if(url==='/api/analyze-detail'&&json?.detail){detailPayload=json.detail;setTimeout(()=>translate('detail',detailPayload),0)}
      }catch{}
    }
    return response;
  };
  let timer;const schedule=()=>{clearTimeout(timer);timer=setTimeout(apply,20)};
  function retranslate(){maps=new Map();restore();const l=lang();if(l==='pl')return;if(basicPayload)translate('analysis',basicPayload);if(detailPayload)translate('detail',detailPayload)}
  document.readyState==='loading'?addEventListener('DOMContentLoaded',()=>{new MutationObserver(schedule).observe(document.body,{subtree:true,childList:true,characterData:true})}):new MutationObserver(schedule).observe(document.body,{subtree:true,childList:true,characterData:true});
  ['languagechange','apo-language-changed','apomonet:language-change'].forEach(e=>addEventListener(e,()=>setTimeout(retranslate,0)));
  window.ApoAnalysisAITranslation={refresh:retranslate,apply};
})();
