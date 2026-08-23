(()=>{
  if(!location.pathname.endsWith('backup.html'))return;
  const KEYS=[
    'apomonet_state_v2','apomonet_verified_knowledge_v2','apomonet_knowledge_v2','apomonet_open_concepts_v1','apomonet_auction_archive_v2',
    'apomonetMultiSourceKnowledgeV1','apomonetCoinFingerprintsV1','apomonetHardNegativesV1','apomonetCommunityEvidenceV1','apomonet_auction_fee_rules_v1',
    'apomonetCalendarPrefs','apomonet_language_v2','apomonet_album_view','apomonet_collection_view_v1','apomonet_collection_sort_v1'
  ];
  const LEGACY=['apomonet_verified_knowledge_v1','apomonet_knowledge_v1','apomonet_auction_archive_v1'];
  const TRANSIENT=['apomonet_demo_album_moves_v1','apomonetAnalysisResilienceV1'];
  const TEXT_KEYS=new Set(['apomonet_language_v2','apomonet_album_view','apomonet_collection_view_v1','apomonet_collection_sort_v1']);
  const JSON_KEYS=new Set(KEYS.filter(k=>!TEXT_KEYS.has(k)));
  const FALLBACK_LANGUAGES=new Set(['pl','en','de','fr']);
  const ALLOWED_TEXT={
    apomonet_album_view:new Set(['grid','list','large','small']),
    apomonet_collection_view_v1:new Set(['grid','list']),
    apomonet_collection_sort_v1:new Set(['added-desc','year-asc','year-desc','nominal-desc','nominal-asc'])
  };
  const allowed=new Set([...KEYS,...LEGACY,...TRANSIENT]);
  const text={
    pl:{choose:'Wybierz plik backupu.',bad:'To nie jest obsługiwany backup APOMONET.',unknown:'Backup zawiera nieobsługiwane pola i został odrzucony.',badValue:'Backup zawiera uszkodzone dane.',confirm:'Przywrócić lokalne dane z backupu? Obecne dane w tej przeglądarce zostaną zastąpione dla zapisanych sekcji.',ok:'Backup przywrócony bezpiecznie. Warstwy wiedzy, fingerprintów i historii korekt przejdą aktualne filtry po ponownym uruchomieniu.',failed:'Nie przywrócono danych: '},
    en:{choose:'Choose a backup file.',bad:'This is not a supported APOMONET backup.',unknown:'The backup contains unsupported fields and was rejected.',badValue:'The backup contains damaged data.',confirm:'Restore local data from this backup? Existing browser data for the included sections will be replaced.',ok:'Backup restored safely. Knowledge, fingerprint and correction-history layers will pass current filters after restart.',failed:'Data were not restored: '},
    de:{choose:'Wählen Sie eine Sicherungsdatei.',bad:'Dies ist keine unterstützte APOMONET-Sicherung.',unknown:'Die Sicherung enthält nicht unterstützte Felder und wurde abgelehnt.',badValue:'Die Sicherung enthält beschädigte Daten.',confirm:'Lokale Daten aus dieser Sicherung wiederherstellen? Vorhandene Browserdaten der enthaltenen Bereiche werden ersetzt.',ok:'Sicherung sicher wiederhergestellt. Wissens-, Fingerprint- und Korrekturverlaufsschichten durchlaufen nach dem Neustart die aktuellen Filter.',failed:'Daten wurden nicht wiederhergestellt: '},
    fr:{choose:'Choisissez un fichier de sauvegarde.',bad:'Cette sauvegarde APOMONET n’est pas prise en charge.',unknown:'La sauvegarde contient des champs non pris en charge et a été refusée.',badValue:'La sauvegarde contient des données endommagées.',confirm:'Restaurer les données locales depuis cette sauvegarde ? Les données actuelles du navigateur seront remplacées pour les sections incluses.',ok:'Sauvegarde restaurée en toute sécurité. Les couches de connaissances, empreintes et historique des corrections passeront les filtres actuels après redémarrage.',failed:'Données non restaurées : '}
  };
  const lang=()=>window.ApoLanguageRegistry?.current?.()||window.ApoI18n?.current?.()||localStorage.getItem('apomonet_language_v2')||'pl';
  const t=k=>text[lang()]?.[k]||text.en[k]||text.pl[k];
  function validateCoreState(raw){
    if(!raw||typeof raw!=='object'||Array.isArray(raw))return false;
    for(const key of ['coins','albums','watchlist','events','history'])if(key in raw&&!Array.isArray(raw[key]))return false;
    if('settings'in raw&&(!raw.settings||typeof raw.settings!=='object'||Array.isArray(raw.settings)))return false;
    return true;
  }
  function languageAllowed(value){
    const normalized=String(value||'').trim().toLowerCase().split('-')[0];
    if(!normalized)return false;
    const registry=window.ApoLanguageRegistry;
    return typeof registry?.isEnabled==='function'?registry.isEnabled(normalized):FALLBACK_LANGUAGES.has(normalized);
  }
  function validateItems(items){
    if(!items||typeof items!=='object'||Array.isArray(items))throw Error(t('bad'));
    const unknown=Object.keys(items).filter(k=>!allowed.has(k));if(unknown.length)throw Error(t('unknown'));
    for(const [k,v] of Object.entries(items)){
      if(typeof v!=='string')throw Error(t('badValue'));
      if(TEXT_KEYS.has(k)){
        if(k==='apomonet_language_v2'){
          if(!languageAllowed(v))throw Error(`${t('badValue')} (${k})`);
          continue;
        }
        const choices=ALLOWED_TEXT[k];
        if(choices&&!choices.has(v))throw Error(`${t('badValue')} (${k})`);
        continue;
      }
      if(JSON_KEYS.has(k)||LEGACY.includes(k)||TRANSIENT.includes(k)){
        let parsed;try{parsed=JSON.parse(v)}catch{throw Error(`${t('badValue')} (${k})`)}
        if(k==='apomonet_state_v2'&&!validateCoreState(parsed))throw Error(`${t('badValue')} (${k})`);
      }
    }
  }
  function durableItems(items){return Object.fromEntries(Object.entries(items||{}).filter(([k])=>!TRANSIENT.includes(k)))}
  function build(){const data={format:'APOMONET_BACKUP',version:8,createdAt:new Date().toISOString(),items:{}};for(const k of KEYS){const v=localStorage.getItem(k);if(v!==null)data.items[k]=v}return data}
  function snapshot(keys){const out={};for(const k of keys)out[k]=localStorage.getItem(k);return out}
  function rollback(before){for(const [k,v] of Object.entries(before)){if(v===null)localStorage.removeItem(k);else localStorage.setItem(k,v)}}
  function transactionalRestore(items){
    const clean=durableItems(items),writeKeys=Object.keys(clean),touched=[...new Set([...writeKeys,...TRANSIENT])],before=snapshot(touched);
    try{
      for(const [k,v] of Object.entries(clean))localStorage.setItem(k,v);
      for(const key of TRANSIENT)localStorage.removeItem(key);
    }catch(error){
      try{rollback(before)}catch{}
      throw error;
    }
  }
  function mount(){
    const download=document.getElementById('download'),restore=document.getElementById('restore'),file=document.getElementById('file'),status=document.getElementById('status');if(!download||!restore||!file||!status)return;
    download.onclick=()=>{const blob=new Blob([JSON.stringify(build(),null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='APOMONET-backup-'+new Date().toISOString().slice(0,10)+'.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1200)};
    restore.onclick=async()=>{const f=file.files?.[0];if(!f){status.textContent=t('choose');return}try{const x=JSON.parse(await f.text());if(x?.format!=='APOMONET_BACKUP'||![1,2,3,4,5,6,7,8].includes(x?.version))throw Error(t('bad'));validateItems(x.items);if(!confirm(t('confirm')))return;transactionalRestore(x.items);status.textContent=t('ok');setTimeout(()=>location.href='index.html',900)}catch(error){status.textContent=t('failed')+(error?.message||String(error))}};
  }
  window.ApoBackupIntegrity=Object.freeze({KEYS,LEGACY,TRANSIENT,TEXT_KEYS,JSON_KEYS,FALLBACK_LANGUAGES,ALLOWED_TEXT,build,validateCoreState,languageAllowed,validateItems,durableItems,transactionalRestore});
  document.readyState==='loading'?addEventListener('DOMContentLoaded',mount):mount();
})();
