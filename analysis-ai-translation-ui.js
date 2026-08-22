(()=>{
  if(!location.pathname.endsWith('analyze.html'))return;
  const LANG_KEY='apomonet_language_v2',OWNER_KEY='apomonetOwnerAnswers';
  const supported=new Set(['en','de','fr']);
  const nativeFetch=window.fetch.bind(window);
  const originals=new WeakMap();
  let maps=new Map(),basicPayload=null,detailPayload=null,seq=0;
  const lang=()=>window.ApoLanguageRegistry?.current?.()||window.ApoI18n?.current?.()||localStorage.getItem(LANG_KEY)||'pl';
  const clean=v=>String(v??'').trim();
  const add=(items,key,value)=>{const text=clean(value);if(text)items.push({key,text})};
  const copy={
    pl:{title:'Potrzebuję dodatkowych informacji',hint:'Te odpowiedzi mogą pomóc rozstrzygnąć identyfikację lub odmianę w Etapie 2.',save:'Zapisz odpowiedzi',saved:'Informacje dodatkowe zapisane.',empty:'Nie wpisano dodatkowych informacji.'},
    en:{title:'Additional information needed',hint:'These answers may help resolve the identification or variety in Stage 2.',save:'Save answers',saved:'Additional information saved.',empty:'No additional information entered.'},
    de:{title:'Zusätzliche Angaben benötigt',hint:'Diese Antworten können helfen, Bestimmung oder Variante in Stufe 2 zu klären.',save:'Antworten speichern',saved:'Zusätzliche Angaben gespeichert.',empty:'Keine zusätzlichen Angaben eingegeben.'},
    fr:{title:'Informations complémentaires nécessaires',hint:'Ces réponses peuvent aider à préciser l’identification ou la variante à l’étape 2.',save:'Enregistrer les réponses',saved:'Informations complémentaires enregistrées.',empty:'Aucune information complémentaire saisie.'}
  };
  const ui=k=>copy[lang()]?.[k]||copy.pl[k];
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
    if(l==='pl'){restore();renderFollowups();return}
    if(maps.size){
      const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n;
      while(n=walker.nextNode()){
        if(!n.parentElement||['SCRIPT','STYLE'].includes(n.parentElement.tagName))continue;
        if(!originals.has(n))originals.set(n,n.nodeValue);
        const raw=originals.get(n),trim=clean(raw),translated=maps.get(trim);
        if(translated)n.nodeValue=raw.replace(trim,translated);
      }
    }
    renderFollowups();
  }
  async function translate(kind,payload){
    const requestedLang=lang();if(!supported.has(requestedLang)||!payload)return;
    const items=itemsFrom(kind,payload);if(!items.length)return;
    const token=++seq;
    try{
      const r=await nativeFetch('/api/translate-analysis',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({language:requestedLang,items})});
      if(!r.ok)return;
      const out=await r.json();
      if(token!==seq||lang()!==requestedLang)return;
      const byKey=out?.translations||{};
      for(const item of items){const translated=clean(byKey[item.key]);if(translated)maps.set(item.text,translated)}
      apply();
      window.dispatchEvent(new CustomEvent('apo:analysis-ai-translated',{detail:{language:requestedLang,kind}}));
    }catch{}
  }
  function translated(text){return maps.get(clean(text))||text}
  function savedAnswers(){try{const x=JSON.parse(sessionStorage.getItem(OWNER_KEY)||'[]');return Array.isArray(x)?x:[]}catch{return[]}}
  function renderFollowups(){
    const qs=Array.isArray(basicPayload?.followUpQuestions)?basicPayload.followUpQuestions.filter(Boolean).slice(0,3):[];
    let box=document.getElementById('apomonetFollowUps');
    if(!qs.length){if(box)box.remove();return}
    const anchor=document.getElementById('deepRecommendation')||document.getElementById('facts');if(!anchor)return;
    if(!box){box=document.createElement('div');box.id='apomonetFollowUps';box.className='detail';anchor.after(box)}
    const old=new Map(savedAnswers().map(x=>[clean(x.question),clean(x.answer)]));
    box.innerHTML=`<b>${ui('title')}</b><p class="muted">${ui('hint')}</p>${qs.map((q,i)=>`<label style="display:block;margin:10px 0"><span style="display:block;margin-bottom:6px">${i+1}. ${translated(q)}</span><input class="input apomonetFollowInput" data-q="${encodeURIComponent(q)}" value="${(old.get(clean(q))||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;')}" autocomplete="off"></label>`).join('')}<button type="button" id="apomonetSaveFollow" class="btn secondary full">${ui('save')}</button>`;
    const save=document.getElementById('apomonetSaveFollow');
    if(save)save.onclick=()=>{
      const answers=[...box.querySelectorAll('.apomonetFollowInput')].map(el=>({question:decodeURIComponent(el.dataset.q||''),answer:clean(el.value)})).filter(x=>x.answer);
      sessionStorage.setItem(OWNER_KEY,JSON.stringify(answers));
      const status=document.getElementById('status');if(status)status.textContent=answers.length?ui('saved'):ui('empty');
      window.dispatchEvent(new CustomEvent('apo:owner-followups-saved',{detail:{answers}}));
    };
  }
  window.fetch=async function(input,init){
    const url=typeof input==='string'?input:String(input?.url||'');
    let nextInit=init;
    if(url==='/api/analyze-detail'&&init?.body){
      try{const body=JSON.parse(init.body),answers=savedAnswers();if(answers.length){body.base={...(body.base||{}),userAdditionalInfo:answers.map(x=>`${x.question}: ${x.answer}`)};nextInit={...init,body:JSON.stringify(body)}}}catch{}
    }
    const response=await nativeFetch(input,nextInit);
    if(response.ok&&(url==='/api/analyze'||url==='/api/analyze-detail')){
      try{
        const json=await response.clone().json();
        if(url==='/api/analyze'&&json?.analysis){basicPayload=json.analysis;setTimeout(()=>{renderFollowups();translate('analysis',basicPayload)},0)}
        if(url==='/api/analyze-detail'&&json?.detail){detailPayload=json.detail;setTimeout(()=>translate('detail',detailPayload),0)}
      }catch{}
    }
    return response;
  };
  let timer;const schedule=()=>{clearTimeout(timer);timer=setTimeout(apply,20)};
  function retranslate(){seq++;maps=new Map();restore();const l=lang();renderFollowups();if(l==='pl')return;if(basicPayload)translate('analysis',basicPayload);if(detailPayload)translate('detail',detailPayload)}
  const mount=()=>{new MutationObserver(schedule).observe(document.body,{subtree:true,childList:true,characterData:true});renderFollowups()};
  document.readyState==='loading'?addEventListener('DOMContentLoaded',mount):mount();
  ['languagechange','apo-language-changed','apomonet:language-change'].forEach(e=>addEventListener(e,()=>setTimeout(retranslate,0)));
  window.ApoAnalysisAITranslation={refresh:retranslate,apply,renderFollowups};
})();
