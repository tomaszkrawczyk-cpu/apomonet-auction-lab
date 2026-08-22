(()=>{
  if(!location.pathname.endsWith('coin.html'))return;
  const known=v=>{const s=String(v??'').trim();return !!s&&s!=='Nie ustalono'};
  const stale=c=>Boolean(c?.derivedDataStale||c?.needsReanalysis);
  const confirmedCatalogParts=c=>{
    if(!c||stale(c))return{reference:'',rarity:''};
    const d=c.detail&&typeof c.detail==='object'?c.detail:{};
    const status=String(d.catalogEvidenceStatus||d.catalogVerification||c.catalogEvidenceStatus||'').trim().toLowerCase();
    const confirmed=d.kopickiConfirmed===true||['supported-by-stage2-variant-evidence','verified-curated','confirmed','verified'].includes(status);
    if(!confirmed)return{reference:'',rarity:''};
    return{reference:known(c.kopickiReference||d.kopickiReference)?String(c.kopickiReference||d.kopickiReference).trim():'',rarity:known(c.kopickiRarity||d.kopickiRarity)?String(c.kopickiRarity||d.kopickiRarity).trim():''};
  };
  const confirmedCatalog=c=>{const p=confirmedCatalogParts(c);return[p.reference,p.rarity].filter(Boolean).join(' • ')};
  const topRarity=c=>{if(stale(c))return'';const p=confirmedCatalogParts(c);if(p.rarity)return p.rarity;return c?.raritySource==='catalog-candidate'?'':(known(c?.rarity)?String(c.rarity).trim():'')};
  const topVariant=c=>known(c?.variant)?String(c.variant).trim():'';
  const photo=(c,side)=>window.ApoCoinPhotoIntegrity?.strictSource?.(c,side)||(side==='obverse'?c?.obverseImage:c?.reverseImage)||'';
  let applying=false,lastSignature='';
  function values(c,facts){return{id:String(c?.id||''),catalog:confirmedCatalog(c)||'—',rarity:topRarity(c)||'—',variant:topVariant(c)||'—',obverse:photo(c,'obverse'),reverse:photo(c,'reverse'),facts:facts.length}}
  function apply(){
    if(applying)return;applying=true;
    try{
      const id=new URLSearchParams(location.search).get('id'),c=id&&window.ApoMonet?.getCoin?.(id);if(!c)return;
      for(const [side,imageId,emptyId] of [['obverse','obverseImage','obverseEmpty'],['reverse','reverseImage','reverseEmpty']]){
        const img=document.getElementById(imageId),empty=document.getElementById(emptyId);if(!img||!empty)continue;const src=photo(c,side);
        if(src){if(img.getAttribute('src')!==src)img.src=src;img.hidden=false;empty.hidden=true}else{img.removeAttribute('src');img.hidden=true;empty.hidden=false}
      }
      const facts=[...document.querySelectorAll('#facts .fact')],v=values(c,facts),set=(index,text)=>{const strong=facts[index]?.querySelector('strong');if(strong&&strong.textContent!==text)strong.textContent=text};
      set(5,v.variant);set(7,v.rarity);set(8,v.catalog);
      lastSignature=Object.values(v).join('|');
    }finally{applying=false}
  }
  function observe(){
    const root=document.getElementById('coinContent');if(!root)return;
    const observer=new MutationObserver(()=>{
      if(applying)return;
      const id=new URLSearchParams(location.search).get('id'),c=id&&window.ApoMonet?.getCoin?.(id);if(!c)return;
      const facts=[...document.querySelectorAll('#facts .fact')],v=values(c,facts),signature=Object.values(v).join('|');
      const current=[facts[5]?.querySelector('strong')?.textContent||'',facts[7]?.querySelector('strong')?.textContent||'',facts[8]?.querySelector('strong')?.textContent||''];
      if(signature!==lastSignature||current[0]!==v.variant||current[1]!==v.rarity||current[2]!==v.catalog)queueMicrotask(apply);
    });
    observer.observe(root,{childList:true,subtree:true,characterData:true});
  }
  const init=()=>{setTimeout(apply,0);observe()};
  document.readyState==='loading'?addEventListener('DOMContentLoaded',init):init();
  ['languagechange','apo-language-changed','apomonet:language-change'].forEach(e=>addEventListener(e,()=>setTimeout(apply,0)));
  window.ApoCoinCardCanonical=Object.freeze({confirmedCatalogParts,confirmedCatalog,topRarity,topVariant,photo,apply});
})();
