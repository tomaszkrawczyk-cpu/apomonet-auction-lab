(()=>{
  if(!location.pathname.endsWith('export.html'))return;
  document.write('<script src="export-record-view.js"><\/script>');
  const L={
    pl:{noneShare:'Brak monet do udostępnienia.',noneExport:'Brak monet do eksportu.',xlsxMissing:'Moduł XLSX nie został załadowany. Odśwież stronę i spróbuj ponownie.',sharing:'Przygotowuję listę do udostępnienia…',copied:'Lista została skopiowana. Możesz wkleić ją do WhatsApp, Messengera lub e-maila.',excelReady:'Przygotowuję plik Excel…',excelDone:'Plik Excel został przygotowany.',excelFailed:'Nie udało się przygotować pliku Excel. Dane kolekcji pozostały bez zmian.',title:'APOMONET — wybrane monety',coin:'Moneta',file:'APOMONET-wybrane-monety.xlsx'},
    en:{noneShare:'No coins to share.',noneExport:'No coins to export.',xlsxMissing:'The XLSX module is not loaded. Refresh the page and try again.',sharing:'Preparing the list for sharing…',copied:'The list has been copied. You can paste it into WhatsApp, Messenger or email.',excelReady:'Preparing the Excel file…',excelDone:'The Excel file is ready.',excelFailed:'The Excel file could not be prepared. Collection data was not changed.',title:'APOMONET — selected coins',coin:'Coin',file:'APOMONET-selected-coins.xlsx'},
    de:{noneShare:'Keine Münzen zum Teilen.',noneExport:'Keine Münzen zum Exportieren.',xlsxMissing:'Das XLSX-Modul wurde nicht geladen. Seite aktualisieren und erneut versuchen.',sharing:'Liste zum Teilen wird vorbereitet…',copied:'Die Liste wurde kopiert. Sie kann in WhatsApp, Messenger oder E-Mail eingefügt werden.',excelReady:'Excel-Datei wird vorbereitet…',excelDone:'Die Excel-Datei ist bereit.',excelFailed:'Die Excel-Datei konnte nicht erstellt werden. Die Sammlungsdaten wurden nicht geändert.',title:'APOMONET — ausgewählte Münzen',coin:'Münze',file:'APOMONET-ausgewaehlte-muenzen.xlsx'},
    fr:{noneShare:'Aucune monnaie à partager.',noneExport:'Aucune monnaie à exporter.',xlsxMissing:'Le module XLSX n’est pas chargé. Actualisez la page et réessayez.',sharing:'Préparation de la liste pour le partage…',copied:'La liste a été copiée. Vous pouvez la coller dans WhatsApp, Messenger ou un e-mail.',excelReady:'Préparation du fichier Excel…',excelDone:'Le fichier Excel est prêt.',excelFailed:'Le fichier Excel n’a pas pu être préparé. Les données de la collection n’ont pas été modifiées.',title:'APOMONET — monnaies sélectionnées',coin:'Monnaie',file:'APOMONET-monnaies-selectionnees.xlsx'}
  };
  const lang=()=>window.ApoLanguageRegistry?.current?.()||window.ApoI18n?.current?.()||localStorage.getItem('apomonet_language_v2')||'pl';
  const t=key=>L[lang()]?.[key]||L.en[key]||L.pl[key]||key;
  const flash=message=>window.ApoActionFeedback?.flash?.(message,1800);
  const selectedCoins=()=>{
    try{
      const ids=JSON.parse(sessionStorage.getItem('apomonet_export_ids')||'[]');
      const state=window.ApoMonet?.load?.()||{coins:[]};
      let result=(state.coins||[]).filter(coin=>ids.includes(coin.id));
      if(!result.length)result=JSON.parse(sessionStorage.getItem('apomonet_demo_export_coins')||'[]');
      return Array.isArray(result)?result:[];
    }catch{return[]}
  };
  function downloadXlsx(button,coins){
    if(!window.ApoXLSXPackage)throw new Error('XLSX_MODULE_MISSING');
    button.disabled=true;
    button.setAttribute('aria-busy','true');
    flash(t('excelReady'));
    try{
      const bytes=ApoXLSXPackage.build(coins);
      if(!(bytes instanceof Uint8Array)||bytes.byteLength<100)throw new Error('XLSX_INVALID_OUTPUT');
      const blob=new Blob([bytes],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
      const url=URL.createObjectURL(blob);
      const anchor=document.createElement('a');
      anchor.href=url;
      anchor.download=t('file');
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(()=>URL.revokeObjectURL(url),10000);
      flash(t('excelDone'));
    }finally{
      setTimeout(()=>{button.disabled=false;button.removeAttribute('aria-busy')},250);
    }
  }
  document.addEventListener('click',async event=>{
    const share=event.target.closest?.('#shareBtn');
    if(share){
      event.preventDefault();event.stopImmediatePropagation();
      const coins=selectedCoins();
      if(!coins.length){flash(t('noneShare'));return}
      flash(t('sharing'));
      const text=t('title')+'\n\n'+coins.map((coin,index)=>`${index+1}. ${coin.title||t('coin')}${coin.year?' — '+coin.year:''}${coin.ruler?' — '+coin.ruler:''}${coin.nominal?' — '+coin.nominal:''}`).join('\n');
      if(navigator.share){try{await navigator.share({title:t('title'),text});return}catch(error){if(error?.name==='AbortError')return}}
      try{await navigator.clipboard.writeText(text);flash(t('copied'))}catch{location.href='mailto:?subject='+encodeURIComponent(t('title'))+'&body='+encodeURIComponent(text)}
      return;
    }
    const excel=event.target.closest?.('#excelBtn');
    if(!excel)return;
    event.preventDefault();event.stopImmediatePropagation();
    const coins=selectedCoins();
    if(!coins.length){flash(t('noneExport'));return}
    if(!window.ApoXLSXPackage){flash(t('xlsxMissing'));return}
    try{downloadXlsx(excel,coins)}catch(error){console.error('[xlsx-export]',error);flash(t('excelFailed'))}
  },true);
})();
