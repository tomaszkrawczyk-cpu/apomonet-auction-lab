(()=>{
  if(!location.pathname.endsWith('collection.html'))return;
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
  function coinForCard(card){const id=card.querySelector('.coin-pick')?.dataset?.id||new URL(card.querySelector('.coin-open')?.href||location.href).searchParams.get('id');return id&&window.ApoMonet?.getCoin?ApoMonet.getCoin(id):null}
  function rarityLabel(coin){
    const detail=coin?.detail&&typeof coin.detail==='object'?coin.detail:{};
    const confirmed=isConfirmed(detail,coin);
    const confirmedRarity=confirmed?clean(coin?.kopickiRarity||detail.kopickiRarity):'';
    const candidate=detail.catalogCandidate&&typeof detail.catalogCandidate==='object'?detail.catalogCandidate:{};
    const candidateRarity=!confirmed?clean(candidate.rarity||coin?.kopickiRarity||detail.kopickiRarity):'';
    const general=clean(coin?.rarityGeneral||coin?.rarity);
    if(confirmedRarity)return `${t('confirmed')}: ${confirmedRarity}`;
    if(candidateRarity)return `${t('candidate')}: ${candidateRarity}?`;
    return general?`${t('general')}: ${general}`:'';
  }
  function updateCard(card){
    const coin=coinForCard(card);if(!coin)return;
    const secondary=card.querySelector('.coin-secondary'),parts=[clean(coin.mint),clean(coin.metal),rarityLabel(coin)].filter(Boolean),text=parts.join(' • ');
    if(parts.length){
      const target=secondary||document.createElement('p');target.className='coin-secondary';if(target.textContent!==text)target.textContent=text;
      if(!secondary)card.querySelector('.coin-summary')?.insertAdjacentElement('afterend',target);
    }else secondary?.remove();
  }
  function refresh(){document.querySelectorAll('.collection-coin').forEach(updateCard)}
  function init(){refresh();const root=document.getElementById('coins');if(root)new MutationObserver(refresh).observe(root,{childList:true});['languagechange','apo-language-changed','apomonet:language-change'].forEach(e=>addEventListener(e,refresh));}
  document.readyState==='loading'?addEventListener('DOMContentLoaded',init):init();
})();