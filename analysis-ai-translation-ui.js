(()=>{
  if(!location.pathname.endsWith('analyze.html'))return;
  const LANG_KEY='apomonet_language_v2',OWNER_KEY='apomonetOwnerAnswers';
  const nativeFetch=window.fetch.bind(window);
  let basicPayload=null,localizedPayload=null;
  const lang=()=>window.ApoLanguageRegistry?.current?.()||window.ApoI18n?.current?.()||localStorage.getItem(LANG_KEY)||'pl';
  const canTranslate=l=>l!=='pl'&&(window.ApoLanguageRegistry?.isEnabled?.(l)??/^[a-z]{2,3}(?:-[A-Za-z0-9]+)?$/.test(String(l||'')));
  const clean=v=>String(v??'').trim();
  const copy={
    pl:{title:'Potrzebuję dodatkowych informacji',hint:'Te odpowiedzi mogą pomóc rozstrzygnąć identyfikację lub odmianę w Etapie 2.',save:'Zapisz odpowiedzi',saved:'Informacje dodatkowe zapisane.',empty:'Nie wpisano dodatkowych informacji.'},
    en:{title:'Additional information needed',hint:'These answers may help resolve the identification or variety in Stage 2.',save:'Save answers',saved:'Additional information saved.',empty:'No additional information entered.'},
    de:{title:'Zusätzliche Angaben benötigt',hint:'Diese Antworten können helfen, Bestimmung oder Variante in Stufe 2 zu klären.',save:'Antworten speichern',saved:'Zusätzliche Angaben gespeichert.',empty:'Keine zusätzlichen Angaben eingegeben.'},
    fr:{title:'Informations complémentaires nécessaires',hint:'Ces réponses peuvent aider à préciser l’identification ou la variante à l’étape 2.',save:'Enregistrer les réponses',saved:'Informations complémentaires enregistrées.',empty:'Aucune information complémentaire saisie.'}
  };
  const ui=k=>copy[lang()]?.[k]||copy.en[k]||copy.pl[k];
  function savedAnswers(){try{const x=JSON.parse(sessionStorage.getItem(OWNER_KEY)||'[]');return Array.isArray(x)?x:[]}catch{return[]}}
  function sourceQuestions(){return Array.isArray(basicPayload?.followUpQuestions)?basicPayload.followUpQuestions.filter(Boolean).slice(0,3):[]}
  function displayQuestions(){
    const source=sourceQuestions();
    const localized=Array.isArray(localizedPayload?.followUpQuestions)?localizedPayload.followUpQuestions:[];
    return source.map((question,index)=>clean(localized[index])||question);
  }
  function escapeHtml(value){return String(value||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
  function escapeAttribute(value){return escapeHtml(value).replace(/"/g,'&quot;')}
  function renderFollowups(){
    const source=sourceQuestions(),shown=displayQuestions();
    let box=document.getElementById('apomonetFollowUps');
    if(!source.length){if(box)box.remove();return}
    const anchor=document.getElementById('deepRecommendation')||document.getElementById('facts');if(!anchor)return;
    if(!box){box=document.createElement('div');box.id='apomonetFollowUps';box.className='detail';anchor.after(box)}
    const old=new Map(savedAnswers().map(x=>[clean(x.question),clean(x.answer)]));
    box.innerHTML=`<b>${ui('title')}</b><p class="muted">${ui('hint')}</p>${source.map((question,index)=>`<label style="display:block;margin:10px 0"><span style="display:block;margin-bottom:6px">${index+1}. ${escapeHtml(shown[index])}</span><input class="input apomonetFollowInput" data-q="${encodeURIComponent(question)}" value="${escapeAttribute(old.get(clean(question))||'')}" autocomplete="off"></label>`).join('')}<button type="button" id="apomonetSaveFollow" class="btn secondary full">${ui('save')}</button>`;
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
    if(response.ok&&url==='/api/analyze'){
      try{const json=await response.clone().json();if(json?.analysis){basicPayload=json.analysis;localizedPayload=null;setTimeout(renderFollowups,0)}}catch{}
    }
    return response;
  };
  addEventListener('apo:analysis-localized',event=>{
    const analysis=event.detail?.analysis;
    if(!analysis)return;
    basicPayload=basicPayload||analysis;
    localizedPayload=event.detail?.translated===false?null:analysis;
    renderFollowups();
  });
  ['languagechange','apo-language-changed','apomonet:language-change'].forEach(eventName=>addEventListener(eventName,()=>setTimeout(renderFollowups,0)));
  const mount=()=>renderFollowups();
  document.readyState==='loading'?addEventListener('DOMContentLoaded',mount):mount();
  window.ApoAnalysisAITranslation={refresh:renderFollowups,apply:renderFollowups,renderFollowups,canTranslate};
})();
