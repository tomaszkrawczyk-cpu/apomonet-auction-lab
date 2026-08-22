(()=>{
  const onEdit=()=>location.pathname.endsWith('coin-edit.html');
  const editable=['title','nominal','ruler','year','mint','metal','variant','grade','rarity','description','notes','provenance','catalog','purchasePrice','currency'];
  const L={
    pl:{missing:'Nie znaleziono tej monety. Zapis został zatrzymany, aby nie utworzyć błędnego rekordu.'},
    en:{missing:'This coin could not be found. Saving was stopped to avoid creating an incorrect record.'},
    de:{missing:'Diese Münze wurde nicht gefunden. Das Speichern wurde gestoppt, damit kein fehlerhafter Datensatz entsteht.'},
    fr:{missing:'Cette monnaie est introuvable. L’enregistrement a été interrompu afin d’éviter la création d’une fiche incorrecte.'}
  };
  const lang=()=>window.ApoLanguageRegistry?.current?.()||window.ApoI18n?.current?.()||localStorage.getItem('apomonet_language_v2')||'pl';
  const text=k=>L[lang()]?.[k]||L.en[k]||L.pl[k];

  function mount(){
    if(!onEdit()||typeof window.saveCorrection!=='function'||!window.ApoMonet)return;
    const original=window.saveCorrection;
    if(original.__apoRecordIntegrity)return;

    function guardedSaveCorrection(){
      const queryId=new URLSearchParams(location.search).get('id');
      if(queryId&&!ApoMonet.getCoin(queryId)){
        const out=document.getElementById('saved');
        if(out)out.textContent=text('missing');
        return null;
      }

      let saved=original();
      if(!saved?.id)return saved;

      // The legacy editor skipped empty values. Explicitly persist every editable field
      // so clearing a wrong mint/variant/catalogue value really removes it.
      const patch={id:saved.id};
      for(const key of editable){
        const el=document.getElementById(key);
        if(el)patch[key]=String(el.value??'').trim();
      }
      saved=ApoMonet.upsertCoin(patch)||ApoMonet.getCoin(saved.id)||saved;
      try{window.coin=saved}catch{}
      return saved;
    }
    guardedSaveCorrection.__apoRecordIntegrity=true;
    window.saveCorrection=guardedSaveCorrection;

    const form=document.getElementById('form');
    if(form&&!form.dataset.apoMissingRecordGuard){
      form.dataset.apoMissingRecordGuard='1';
      form.addEventListener('submit',event=>{
        const queryId=new URLSearchParams(location.search).get('id');
        if(queryId&&!ApoMonet.getCoin(queryId)){
          event.preventDefault();event.stopImmediatePropagation();
          const out=document.getElementById('saved');if(out)out.textContent=text('missing');
        }
      },true);
    }
  }

  document.readyState==='loading'?addEventListener('DOMContentLoaded',mount):setTimeout(mount,0);
})();