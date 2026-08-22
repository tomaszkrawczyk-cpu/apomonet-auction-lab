(() => {
  const L={
    pl:{pair:'📷 Wybierz awers i rewers razem',note:'W galerii zaznacz dokładnie dwa zdjęcia: najpierw awers, potem rewers. Kafle poniżej służą do wymiany tylko jednej strony.',exact:'Wybierz dokładnie dwa zdjęcia: awers i rewers.',failed:'Nie udało się wczytać obu zdjęć jednocześnie. Użyj kafli awers/rewers.',transport:'Połączenie telefonu z analizą zostało przerwane. Zdjęcia pozostają wybrane — spróbuj ponownie bez ponownego wczytywania.'},
    en:{pair:'📷 Choose obverse and reverse together',note:'Select exactly two photos in the gallery: obverse first, reverse second. Use the tiles below only to replace one side.',exact:'Select exactly two photos: obverse and reverse.',failed:'Both photos could not be loaded together. Use the obverse/reverse tiles.',transport:'The connection between your device and the analysis was interrupted. Your photos remain selected — try again without choosing them again.'},
    de:{pair:'📷 Vorder- und Rückseite zusammen wählen',note:'Wählen Sie genau zwei Fotos: zuerst die Vorderseite, dann die Rückseite. Die Kacheln darunter dienen nur zum Ersetzen einer Seite.',exact:'Wählen Sie genau zwei Fotos: Vorder- und Rückseite.',failed:'Beide Fotos konnten nicht zusammen geladen werden. Verwenden Sie die Kacheln für Vorder-/Rückseite.',transport:'Die Verbindung zwischen Gerät und Analyse wurde unterbrochen. Die Fotos bleiben ausgewählt — versuchen Sie es erneut, ohne sie neu auszuwählen.'},
    fr:{pair:'📷 Choisir avers et revers ensemble',note:'Sélectionnez exactement deux photos : d’abord l’avers, puis le revers. Les tuiles ci-dessous servent uniquement à remplacer une face.',exact:'Sélectionnez exactement deux photos : avers et revers.',failed:'Impossible de charger les deux photos ensemble. Utilisez les tuiles avers/revers.',transport:'La connexion entre votre appareil et l’analyse a été interrompue. Les photos restent sélectionnées — réessayez sans les choisir à nouveau.'}
  };
  const lang=()=>window.ApoLanguageRegistry?.current?.()||window.ApoI18n?.current?.()||localStorage.getItem('apomonet_language_v2')||'pl';
  const t=k=>L[lang()]?.[k]||L.en[k]||L.pl[k]||k;
  const endpoint=input=>{try{const raw=typeof input==='string'?input:String(input?.url||'');return new URL(raw,location.href).pathname}catch{return''}};
  const isAnalysisEndpoint=input=>['/api/analyze','/api/analyze-detail'].includes(endpoint(input));
  function ready(fn){document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn):fn()}
  ready(()=>{
    if(!location.pathname.endsWith('analyze.html'))return;
    const oi=document.getElementById('obverseInput'),ri=document.getElementById('reverseInput'),go=document.getElementById('go'),status=document.getElementById('status');
    if(!oi||!ri||!go)return;
    oi.removeAttribute('capture');ri.removeAttribute('capture');
    const grid=document.querySelector('.coin-grid');
    if(grid&&!document.getElementById('pairPicker')){
      const box=document.createElement('div');box.style.margin='0 0 14px';box.innerHTML='<button id="pairBtn" type="button" class="btn primary full"></button><input id="pairPicker" class="browser-file-input" type="file" accept="image/*" multiple><div id="pairNote" class="photo-note"></div>';grid.before(box);
      const p=box.querySelector('#pairPicker'),b=box.querySelector('#pairBtn'),note=box.querySelector('#pairNote');
      const renderLabels=()=>{b.textContent=t('pair');note.textContent=t('note')};renderLabels();['languagechange','apo-language-changed','apomonet:language-change'].forEach(e=>addEventListener(e,renderLabels));
      b.onclick=()=>p.click();
      p.onchange=async()=>{
        const fs=[...(p.files||[])];
        if(fs.length!==2){if(status)status.textContent=t('exact');p.value='';return}
        try{const dt1=new DataTransfer(),dt2=new DataTransfer();dt1.items.add(fs[0]);dt2.items.add(fs[1]);oi.files=dt1.files;ri.files=dt2.files;oi.dispatchEvent(new Event('change',{bubbles:true}));setTimeout(()=>ri.dispatchEvent(new Event('change',{bubbles:true})),180)}catch(e){console.warn(e);if(status)status.textContent=t('failed')}finally{p.value=''}
      };
    }
    let transportFailed=false;
    const oldFetch=window.fetch.bind(window);
    window.fetch=async(input,init)=>{try{const r=await oldFetch(input,init);if(isAnalysisEndpoint(input))transportFailed=false;return r}catch(e){if(isAnalysisEndpoint(input)){transportFailed=true;if(status)status.textContent=t('transport')}throw e}};
    new MutationObserver(()=>{if(!status||!transportFailed)return;if(/Failed to fetch|NetworkError|Load failed/i.test(status.textContent||''))status.textContent=t('transport')}).observe(status,{childList:true,subtree:true,characterData:true});
    ['languagechange','apo-language-changed','apomonet:language-change'].forEach(e=>addEventListener(e,()=>{if(transportFailed&&status)status.textContent=t('transport')}));
  });
  window.ApoUnifiedUpload=Object.freeze({endpoint,isAnalysisEndpoint});
})();