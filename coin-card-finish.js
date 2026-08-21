(()=>{
  if(!location.pathname.endsWith('coin.html'))return;
  const parse=(raw)=>{try{return JSON.parse(raw||'null')}catch{return null}};
  const id=new URLSearchParams(location.search).get('id');
  if(!id||!window.ApoMonet)return;

  const coin=ApoMonet.getCoin(id);
  const session=parse(sessionStorage.getItem('apomonetAnalysisSession'));
  if(coin&&session?.id===id&&Array.isArray(session.imgs)){
    const patch={id};let changed=false;
    if(!coin.obverseImage&&session.imgs[0]){patch.obverseImage=session.imgs[0];changed=true;}
    if(!coin.reverseImage&&session.imgs[1]){patch.reverseImage=session.imgs[1];changed=true;}
    if(changed){try{ApoMonet.upsertCoin(patch)}catch(error){console.warn('[coin-photo-recovery]',error)}}
  }

  addEventListener('DOMContentLoaded',()=>{
    const content=document.getElementById('coinContent');if(!content)return;
    const current=ApoMonet.getCoin(id);if(!current)return;
    const style=document.createElement('style');style.textContent=`
      .apo-saved-banner{margin:0 0 18px;padding:15px 16px;border:1px solid #315c27;border-radius:16px;background:#10180d;color:#d9f6cf}.apo-saved-banner strong{display:block;color:#83df63;font-size:17px;margin-bottom:4px}
      .coin-content .grid.two{grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.coin-content .photo-card{padding:12px}.coin-content .photo-card h2{font-size:17px;margin:0 0 10px}.coin-content .photo-card img{aspect-ratio:1;max-height:none;object-fit:contain;background:radial-gradient(circle at 50% 45%,#29292b,#0b0b0c 72%)}.coin-content .empty{min-height:220px;display:grid;place-items:center;border:1px dashed #3b3b40;border-radius:14px;color:#8f8f95;text-align:center}.coin-content .facts{grid-template-columns:1fr}.coin-content .fact{display:flex;justify-content:space-between;gap:18px;align-items:center;padding:13px 15px}.coin-content .fact span{margin:0}.coin-content .toolbar{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}
      .apo-detail-card,.apo-purchase-card{margin-top:16px}.apo-detail-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.apo-detail-item{padding:13px 14px;border:1px solid #29292c;border-radius:14px;background:#121214}.apo-detail-item span{display:block;color:#8f8f95;font-size:12px;margin-bottom:5px}.apo-detail-item strong,.apo-detail-item p{margin:0;line-height:1.5}.apo-detail-wide{grid-column:1/-1}.apo-trust{display:inline-flex;padding:5px 9px;border-radius:999px;border:1px solid #4a4a50;background:#171719;font-size:12px;font-weight:800}.apo-trust[data-rank="70"],.apo-trust[data-rank="90"]{border-color:#315c27;background:#10180d;color:#9ee68a}.apo-catalog-warning{color:#efc379}
      @media(max-width:560px){.coin-content .grid.two{grid-template-columns:repeat(2,minmax(0,1fr))}.coin-content .toolbar{grid-template-columns:1fr}.coin-content .empty{min-height:155px}.coin-content .fact{align-items:flex-start}.coin-content .fact strong{text-align:right}.apo-detail-grid{grid-template-columns:1fr}.apo-detail-wide{grid-column:auto}}
    `;document.head.appendChild(style);
    if(!document.querySelector('.apo-saved-banner')){const banner=document.createElement('section');banner.className='apo-saved-banner';banner.innerHTML='<strong>✓ Zapisano do kolekcji</strong><span>Zdjęcia i zaakceptowane dane tej monety są zapisane razem.</span>';content.prepend(banner)}
    const addTo=(grid,label,value,{wide=false,warning=false}={})=>{const text=String(value??'').trim();if(!text)return;const box=document.createElement('div');box.className='apo-detail-item'+(wide?' apo-detail-wide':'');const l=document.createElement('span');l.textContent=label;const p=document.createElement('p');p.textContent=text;if(warning)p.className='apo-catalog-warning';box.append(l,p);grid.appendChild(box)};
    if(current.purchaseStatus==='purchased'){
      const purchase=document.createElement('section');purchase.className='card apo-purchase-card';purchase.innerHTML='<div class="section-title"><h2>Zakup</h2><span class="todo">W KOLEKCJI</span></div>';
      const pg=document.createElement('div');pg.className='apo-detail-grid';addTo(pg,'Dom aukcyjny / źródło',current.purchaseSource||current.auctionSource);addTo(pg,'Data zakupu',current.purchasedAt?new Date(current.purchasedAt).toLocaleDateString('pl-PL'):'');addTo(pg,'Cena zakupu',current.purchasePrice!=null&&current.purchasePrice!==''?`${current.purchasePrice} ${current.purchaseCurrency||current.currency||'PLN'}`:'');
      if(current.purchaseSourceUrl){const box=document.createElement('div');box.className='apo-detail-item apo-detail-wide';const s=document.createElement('span');s.textContent='Źródło zakupu';const a=document.createElement('a');a.href=current.purchaseSourceUrl;a.target='_blank';a.rel='noopener';a.textContent='Otwórz oryginalne źródło →';box.append(s,a);pg.appendChild(box)}purchase.appendChild(pg);content.appendChild(purchase);
    }
    const detail=current.detail;const trust=window.ApoKnowledgeTrust?.level?.(current)||{label:current.userAccepted?'Korekta użytkownika':'Sugestia AI',rank:current.userAccepted?30:10};
    const card=document.createElement('section');card.className='card apo-detail-card';const h=document.createElement('div');h.className='section-title';const title=document.createElement('h2');title.textContent=detail?'Analiza szczegółowa':'Status rekordu';const badge=document.createElement('span');badge.className='apo-trust';badge.dataset.rank=String(trust.rank||10);badge.textContent=trust.label||'Sugestia AI';h.append(title,badge);card.appendChild(h);const grid=document.createElement('div');grid.className='apo-detail-grid';
    if(detail){
      addTo(grid,'Odmiana / wariant',detail.variant||current.variant);
      const catalog=[detail.kopickiReference,detail.kopickiRarity].filter(Boolean).join(' • ');
      const candidate=detail.catalogCandidate||{};
      const candidateText=[candidate.reference,candidate.rarity].filter(Boolean).join(' • ');
      if(catalog)addTo(grid,'Kopicki / rzadkość',catalog);
      else if(candidateText)addTo(grid,'Kandydat Kopicki — wymaga potwierdzenia',candidateText,{warning:true});
      else addTo(grid,'Kopicki / rzadkość','Nie ustalono',{warning:true});
      addTo(grid,'Awers — obserwacje',detail.obverseDetails,{wide:true});addTo(grid,'Rewers — obserwacje',detail.reverseDetails,{wide:true});addTo(grid,'Legenda awersu',detail.obverseLegend,{wide:true});addTo(grid,'Legenda rewersu',detail.reverseLegend,{wide:true});addTo(grid,'Cechy diagnostyczne',Array.isArray(detail.diagnosticFeatures)?detail.diagnosticFeatures.join('; '):detail.diagnosticFeatures,{wide:true});addTo(grid,'Stan — ocena ostrożna',detail.gradeAssessment,{wide:true});addTo(grid,'Co może rozstrzygnąć wynik',Array.isArray(detail.recommendedChecks)?detail.recommendedChecks.join(' '):detail.recommendedChecks,{wide:true});addTo(grid,'Uwagi i ograniczenia',Array.isArray(detail.warnings)?detail.warnings.join(' '):detail.warnings,{wide:true,warning:true})}
    card.appendChild(grid);const toolbar=content.querySelector('.toolbar');if(toolbar)content.insertBefore(card,toolbar);else content.appendChild(card);
  });
})();
