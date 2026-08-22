(()=>{
 if(!location.pathname.endsWith('coin.html'))return;
 const L={pl:{candidate:'kandydat',title:'Wymaga potwierdzenia katalogowego'},en:{candidate:'candidate',title:'Requires catalog confirmation'},de:{candidate:'Kandidat',title:'Katalogbestätigung erforderlich'},fr:{candidate:'candidat',title:'Confirmation dans le catalogue requise'}};
 const lang=()=>window.ApoLanguageRegistry?.current?.()||window.ApoI18n?.current?.()||localStorage.getItem('apomonet_language_v2')||'pl',t=k=>L[lang()]?.[k]||L.en[k]||L.pl[k]||k;
 function confirmedKopicki(detail){
   const status=String(detail?.catalogVerification||detail?.catalogEvidenceStatus||'').trim().toLowerCase();
   const hasReference=String(detail?.kopickiReference||'').trim();
   const hasRarity=String(detail?.kopickiRarity||'').trim();
   return Boolean(hasReference&&hasRarity&&(status==='verified-curated'||status==='confirmed'||status==='verified'||detail?.kopickiConfirmed===true));
 }
 function render(){
   const id=new URLSearchParams(location.search).get('id'),coin=id&&window.ApoMonet?ApoMonet.getCoin(id):null,facts=document.getElementById('facts');
   if(!coin||!facts)return;
   const detail=coin.detail&&typeof coin.detail==='object'?coin.detail:{},candidate=detail.catalogCandidate&&typeof detail.catalogCandidate==='object'?detail.catalogCandidate:{},variant=detail.variant||coin.variant||'',boxes=[...facts.querySelectorAll('.fact')],set=(index,value)=>{const strong=boxes[index]?.querySelector('strong');if(strong&&String(value||'').trim())strong.textContent=String(value).trim()};
   const kopickiConfirmed=confirmedKopicki(detail);
   const rarity=kopickiConfirmed?detail.kopickiRarity:(coin.rarity&&coin.raritySource!=='catalog-candidate'?coin.rarity:'');
   const catalog=kopickiConfirmed?detail.kopickiReference:(coin.catalog&&coin.catalogSource!=='catalog-candidate'?coin.catalog:'');
   set(5,variant);
   if(rarity)set(7,rarity);
   if(catalog)set(8,catalog);
   if(!kopickiConfirmed&&candidate.reference){const strong=boxes[8]?.querySelector('strong');if(strong){strong.textContent=`${candidate.reference} — ${t('candidate')}`;strong.title=t('title')}}
 }
 window.ApoCoinStage2Summary=Object.freeze({confirmedKopicki});
 addEventListener('DOMContentLoaded',render);['languagechange','apo-language-changed','apomonet:language-change'].forEach(e=>addEventListener(e,render));
})();