(()=>{
  if(!location.pathname.endsWith('coin.html'))return;
  const known=v=>{const s=String(v??'').trim();return !!s&&s!=='Nie ustalono'};
  const stale=c=>Boolean(c?.derivedDataStale||c?.needsReanalysis);
  const confirmedCatalog=c=>{
    if(!c||stale(c))return'';
    const d=c.detail&&typeof c.detail==='object'?c.detail:{};
    const status=String(d.catalogEvidenceStatus||d.catalogVerification||c.catalogEvidenceStatus||'').trim().toLowerCase();
    const confirmed=d.kopickiConfirmed===true||['supported-by-stage2-variant-evidence','verified-curated','confirmed','verified'].includes(status);
    if(!confirmed)return'';
    return [c.kopickiReference||d.kopickiReference,c.kopickiRarity||d.kopickiRarity].filter(known).join(' • ');
  };
  const photo=(c,side)=>window.ApoCoinPhotoIntegrity?.strictSource?.(c,side)||(side==='obverse'?c?.obverseImage:c?.reverseImage)||'';
  function apply(){
    const id=new URLSearchParams(location.search).get('id'),c=id&&window.ApoMonet?.getCoin?.(id);if(!c)return;
    for(const [side,imageId,emptyId] of [['obverse','obverseImage','obverseEmpty'],['reverse','reverseImage','reverseEmpty']]){
      const img=document.getElementById(imageId),empty=document.getElementById(emptyId);if(!img||!empty)continue;const src=photo(c,side);
      if(src){if(img.src!==src)img.src=src;img.hidden=false;empty.hidden=true}else{img.removeAttribute('src');img.hidden=true;empty.hidden=false}
    }
    const facts=document.querySelectorAll('#facts .fact');
    if(facts[8]){const strong=facts[8].querySelector('strong');if(strong)strong.textContent=confirmedCatalog(c)||'—'}
  }
  document.readyState==='loading'?addEventListener('DOMContentLoaded',()=>setTimeout(apply,0)):setTimeout(apply,0);
  ['languagechange','apo-language-changed','apomonet:language-change'].forEach(e=>addEventListener(e,()=>setTimeout(apply,0)));
  window.ApoCoinCardCanonical=Object.freeze({confirmedCatalog,photo,apply});
})();
