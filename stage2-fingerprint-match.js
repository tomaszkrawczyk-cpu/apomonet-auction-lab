(()=>{
 const $=id=>document.getElementById(id);
 function globalAnalysis(){try{return (0,eval)('typeof a!=="undefined" ? a : null')}catch{return null}}
 function ensureBox(){const panel=$('deepPanel');if(!panel)return null;let box=$('fingerprintMatchBox');if(!box){box=document.createElement('div');box.id='fingerprintMatchBox';box.className='detail';box.style.marginTop='12px';panel.appendChild(box)}return box}
 function label(k){const M={punctuationPattern:'interpunkcja',dateSpacing:'rozstaw daty',datePosition:'pozycja daty',legendStartClock:'początek legendy',legendEndClock:'koniec legendy',portraitOrientation:'portret',crownShape:'korona',shieldPosition:'tarcza/herb',mintMarkPosition:'znak menniczy',eagleTail:'ogon orła',wingPattern:'skrzydła',featherPattern:'pióra',letterForms:'litery',digitForms:'cyfry',monogramShape:'monogram',edgeFeature:'rant'};return M[k]||k}
 function applyEvidence(cur,candidates){
  const trusted=candidates.filter(x=>x.expertAccepted&&x.match.matchedFeatures>=5);
  if(!trusted.length)return null;
  const best=trusted[0],m=best.match,detail=cur.detail||cur;
  let status='neutral',note='Fingerprint porównano ze wzorcem eksperckim.';
  if(m.similarity>=85&&!m.conflicts.length){status='supported';note='Fingerprint wspiera identyfikację na podstawie zweryfikowanego wzorca eksperckiego.'}
  else if((m.conflicts?.length>=2&&m.matchedFeatures>=5)||m.similarity<45){status='conflict';note='Fingerprint jest w istotnym konflikcie ze zweryfikowanym wzorcem eksperckim. Wymagana ręczna kontrola odmiany/stempla.';detail.confidence=Math.min(Number(detail.confidence||0),70);if(cur.confidence!=null)cur.confidence=Math.min(Number(cur.confidence||0),70);detail.warnings=[...(detail.warnings||[]),note];const dc=$('deepConf');if(dc)dc.textContent=`Pewność ${detail.confidence||0}% • konflikt fingerprintu`}
  detail.fingerprintEvidence={status,source:'expert_template',templateId:best.id,similarity:m.similarity,matchedFeatures:m.matchedFeatures,conflicts:m.conflicts||[],note};
  return detail.fingerprintEvidence;
 }
 function render(){
  if(!window.ApoFingerprint)return;
  const cur=globalAnalysis(),fp=cur?.detail?.fingerprint||cur?.fingerprint;if(!fp)return;
  const box=ensureBox();if(!box)return;
  const candidates=ApoFingerprint.candidates(cur,fp,5).filter(x=>!cur.id||x.coinId!==cur.id);
  const featureCount=Object.values(fp.features||{}).filter(x=>x&&x.value!=null&&x.value!=='').length;
  if(!candidates.length){box.innerHTML=`<b>🧬 Fingerprint monety</b><p>Wykryto ${featureCount} cech diagnostycznych. Biblioteka nie ma jeszcze co najmniej 3 wspólnych cech z innym wzorcem, więc APOMONET nie podaje sztucznej zgodności.</p>`;return}
  const ev=applyEvidence(cur,candidates);
  const evText=ev?.status==='supported'?'<p><strong>✓ Zweryfikowany wzorzec wspiera identyfikację.</strong></p>':ev?.status==='conflict'?'<p><strong>⚠️ Konflikt ze zweryfikowanym wzorcem — pewność Etapu 2 została ograniczona.</strong></p>':'';
  box.innerHTML='<b>🧬 Porównanie fingerprintu</b><p class="muted">Porównanie dotyczy cech stempla, nie podobieństwa całych fotografii. Tylko wzorzec zweryfikowany ekspercko może wpływać na pewność wyniku.</p>'+evText+candidates.map((x,i)=>{const m=x.match,c=[x.identity.ruler,x.identity.nominal,x.identity.year,x.identity.mint,x.identity.variant].filter(Boolean).join(' • '),conflict=m.conflicts?.length?' • konflikty: '+m.conflicts.map(label).join(', '):'';return `<div style="padding:10px 0;border-top:1px solid #29292c"><strong>${i+1}. ${c||'Wzorzec'}</strong><br><span>${m.similarity}% • ${m.matchedFeatures} wspólnych cech • ${m.quality}${conflict}</span>${x.expertAccepted?'<br><small>✓ wzorzec zweryfikowany ekspercko</small>':x.ownerAccepted?'<br><small>zaakceptowany przez właściciela — nie zmienia confidence</small>':''}</div>`}).join('');
 }
 addEventListener('DOMContentLoaded',()=>{if(!location.pathname.endsWith('analyze.html'))return;const deep=$('deep');if(!deep)return;deep.addEventListener('click',()=>{let n=0;const t=setInterval(()=>{n++;render();const x=globalAnalysis();if(x?.detail?.fingerprint||n>80)clearInterval(t)},150)});setTimeout(render,500)});
})();
