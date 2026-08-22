(()=>{
  if(!location.pathname.endsWith('analyze.html'))return;
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const has=v=>v!==undefined&&v!==null&&String(v).trim()!=='';
  const join=(arr,sep=' • ')=>arr.filter(has).map(x=>String(x).trim()).join(sep);
  function section(title,body){if(!has(body))return'';return `<section style="margin-top:14px"><b>${esc(title)}</b><p style="margin:6px 0 0;line-height:1.55">${esc(body)}</p></section>`}
  function literatureText(){const refs=window.__apoConfirmedStage2Literature?.references||[];if(!refs.length)return'Brak potwierdzonego odniesienia katalogowego dla tej konkretnej odmiany.';return refs.map(r=>{let x=`${r.label}: ${r.value}`;if(r.rarity)x+=` • rzadkość ${r.rarity}`;if(r.id==='tyszkiewicz'&&r.historicalValue)x+=' • historyczna wartość katalogowa';return x}).join(' | ')}
  function render(payload){
    const d=payload?.detail||window.__apoStage2Detail||{};
    const b=payload?.base||window.__apoStage2Base||{};
    const deep=document.getElementById('deepText');if(!deep)return;
    const identification=join([b.country,d.country,b.ruler,d.ruler,b.nominal,d.nominal,b.year,d.year,b.mint,d.mint,b.metal,d.metal]);
    const variant=join([d.variant,d.visibleDateReading,d.mintmaster,d.legendPunctuation]);
    const rarity=join([d.kopickiRarity,d.rarity,d.rarityAssessment,d.rarityComment]);
    const features=[];
    if(has(d.obverseLegend))features.push(`Awers: ${d.obverseLegend}`);
    if(has(d.reverseLegend))features.push(`Rewers: ${d.reverseLegend}`);
    if(has(d.obverseDetails))features.push(`Awers — cechy: ${d.obverseDetails}`);
    if(has(d.reverseDetails))features.push(`Rewers — cechy: ${d.reverseDetails}`);
    if(Array.isArray(d.diagnosticFeatures)&&d.diagnosticFeatures.length)features.push(`Cechy diagnostyczne: ${d.diagnosticFeatures.join('; ')}`);
    if(has(d.gradeAssessment))features.push(`Stan: ${d.gradeAssessment}`);
    if(Array.isArray(d.authenticitySignals)&&d.authenticitySignals.length)features.push(`Autentyczność — obserwacje: ${d.authenticitySignals.join(' ')}`);
    const market=join([d.auctionSummary,d.marketSummary,d.auctionRecordsSummary,d.priceContext]);
    const valuation=join([d.valuationSummary,d.priceRange,d.estimatedValue]);
    const cautions=[];
    if(Array.isArray(d.recommendedChecks)&&d.recommendedChecks.length)cautions.push(`Do dalszej weryfikacji: ${d.recommendedChecks.join(' ')}`);
    if(Array.isArray(d.warnings)&&d.warnings.length)cautions.push(`Ograniczenia: ${d.warnings.join(' ')}`);
    const html=`<div id="apoProfessionalStage2" style="margin-top:2px">
      ${section('1. Identyfikacja',identification)}
      ${section('2. Odmiana i cechy rozstrzygające',variant)}
      ${section('3. Literatura i katalogi',literatureText())}
      ${section('4. Rzadkość',rarity)}
      ${section('5. Cechy konkretnego egzemplarza',features.join(' '))}
      ${section('6. Notowania i kontekst rynkowy',market)}
      ${section('7. Wycena',valuation)}
      ${section('8. Uwagi i ograniczenia',cautions.join(' '))}
      ${section('Opis APOMONET',d.fullDescription||d.description)}
    </div>`;
    setTimeout(()=>{if(document.getElementById('deepText'))document.getElementById('deepText').innerHTML=html},0);
  }
  window.addEventListener('apo-stage2-detail',e=>render(e.detail));
  if(window.__apoStage2Detail)render({base:window.__apoStage2Base,detail:window.__apoStage2Detail});
})();
