(()=>{
  if(!location.pathname.endsWith('user-album.html'))return;
  const L={
    pl:{general:'Rzadkość ogólna',confirmed:'Kopicki potwierdzony',candidate:'Kandydat Kopicki'},
    en:{general:'General rarity',confirmed:'Confirmed Kopicki',candidate:'Kopicki candidate'},
    de:{general:'Allgemeine Seltenheit',confirmed:'Kopicki bestätigt',candidate:'Kopicki-Kandidat'},
    fr:{general:'Rareté générale',confirmed:'Kopicki confirmé',candidate:'Candidat Kopicki'}
  };
  const lang=()=>window.ApoLanguageRegistry?.current?.()||window.ApoI18n?.current?.()||localStorage.getItem('apomonet_language_v2')||'pl';
  const t=k=>L[lang()]?.[k]||L.en[k]||L.pl[k]||k;
  const clean=v=>String(v??'').trim();
  const CONFIRMED=new Set(['supported-by-stage2-variant-evidence','verified-curated','confirmed','verified']);
  const isConfirmed=(detail,coin)=>detail?.kopickiConfirmed===true||CONFIRMED.has(clean(detail?.catalogEvidenceStatus||detail?.catalogVerification||coin?.catalogEvidenceStatus).toLowerCase());
  const coinById=id=>id&&window.ApoMonet?.getCoin?ApoMonet.getCoin(id):null;
  function evidenceText(coin){
    const detail=coin?.detail&&typeof coin.detail==='object'?coin.detail:{};
    const confirmed=isConfirmed(detail,coin);
    const confirmedRef=confirmed?clean(coin?.kopickiReference||detail.kopickiReference):'';
    const confirmedRarity=confirmed?clean(coin?.kopickiRarity||detail.kopickiRarity):'';
    const candidate=detail.catalogCandidate&&typeof detail.catalogCandidate==='object'?detail.catalogCandidate:{};
    const candidateRef=!confirmed?clean(candidate.reference||coin?.kopickiReference||detail.kopickiReference):'';
    const candidateRarity=!confirmed?clean(candidate.rarity||coin?.kopickiRarity||detail.kopickiRarity):'';
    const general=clean(coin?.rarityGeneral||coin?.rarity);
    if(confirmedRef||confirmedRarity)return `${t('confirmed')}: ${[confirmedRef,confirmedRarity].filter(Boolean).join(' • ')}`;
    if(candidateRef||candidateRarity)return `${t('candidate')}: ${[candidateRef,candidateRarity].filter(Boolean).join(' • ')}?`;
    return general?`${t('general')}: ${general}`:'';
  }
  function refresh(){
    document.querySelectorAll('#list .coin-card').forEach(card=>{
      const id=card.querySelector('.coin-pick')?.dataset?.id||card.querySelector('.remove')?.dataset?.id||card.querySelector('.move')?.dataset?.id;
      const coin=coinById(id),text=evidenceText(coin);let row=card.querySelector('.apo-album-catalog-evidence');
      if(!text){row?.remove();return}
      if(!row){row=document.createElement('p');row.className='muted apo-album-catalog-evidence';const actions=card.querySelector('.actions');actions?card.insertBefore(row,actions):card.appendChild(row)}
      if(row.textContent!==text)row.textContent=text;
    });
  }
  function init(){refresh();const root=document.getElementById('list');if(root)new MutationObserver(refresh).observe(root,{childList:true});['languagechange','apo-language-changed','apomonet:language-change'].forEach(e=>addEventListener(e,refresh));}
  document.readyState==='loading'?addEventListener('DOMContentLoaded',init):init();
})();