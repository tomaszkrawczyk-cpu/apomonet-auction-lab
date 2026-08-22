(()=>{
  if(!location.pathname.endsWith('coin.html'))return;
  const L={
    pl:{confirm:n=>`Usunąć „${n}” z całej kolekcji? Tej operacji nie można cofnąć.`},
    en:{confirm:n=>`Delete “${n}” from the entire collection? This action cannot be undone.`},
    de:{confirm:n=>`„${n}“ aus der gesamten Sammlung löschen? Diese Aktion kann nicht rückgängig gemacht werden.`},
    fr:{confirm:n=>`Supprimer « ${n} » de toute la collection ? Cette action est irréversible.`}
  };
  const lang=()=>window.ApoLanguageRegistry?.current?.()||window.ApoI18n?.current?.()||localStorage.getItem('apomonet_language_v2')||'pl';
  function mount(){setTimeout(()=>{
    const button=document.getElementById('deleteCoin'),id=new URLSearchParams(location.search).get('id');if(!button||!id||!window.ApoMonet)return;
    button.onclick=()=>{const coin=ApoMonet.getCoin(id);if(!coin)return;const name=coin.title||coin.nominal||({pl:'tę monetę',en:'this coin',de:'diese Münze',fr:'cette monnaie'}[lang()]||'this coin');const copy=L[lang()]||L.en;if(!confirm(copy.confirm(name)))return;if(ApoMonet.deleteCoin(id)!==false)location.href='collection.html'};
  },0)}
  document.readyState==='loading'?addEventListener('DOMContentLoaded',mount):mount();
  ['languagechange','apo-language-changed','apomonet:language-change'].forEach(event=>addEventListener(event,mount));
})();
