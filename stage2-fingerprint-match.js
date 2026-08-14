(()=>{
 const $=id=>document.getElementById(id);
 function globalAnalysis(){
  try{return (0,eval)('typeof a!=="undefined" ? a : null')}catch{return null}
 }
 function ensureBox(){
  const panel=$('deepPanel'); if(!panel)return null;
  let box=$('fingerprintMatchBox');
  if(!box){box=document.createElement('div');box.id='fingerprintMatchBox';box.className='detail';box.style.marginTop='12px';panel.appendChild(box)}
  return box;
 }
 function label(k){const M={punctuationPattern:'interpunkcja',dateSpacing:'rozstaw daty',datePosition:'pozycja daty',legendStartClock:'początek legendy',legendEndClock:'koniec legendy',portraitOrientation:'portret',crownShape:'korona',shieldPosition:'tarcza/herb',mintMarkPosition:'znak menniczy',eagleTail:'ogon orła',wingPattern:'skrzydła',featherPattern:'pióra',letterForms:'litery',digitForms:'cyfry',monogramShape:'monogram',edgeFeature:'rant'};return M[k]||k}
 function render(){
  if(!window.ApoFingerprint)return;
  const cur=globalAnalysis(); const fp=cur?.detail?.fingerprint||cur?.fingerprint;
  if(!fp)return;
  const box=ensureBox(); if(!box)return;
  const candidates=ApoFingerprint.candidates(cur,fp,5).filter(x=>!cur.id||x.coinId!==cur.id);
  const featureCount=Object.values(fp.features||{}).filter(x=>x&&x.value!=null&&x.value!=='').length;
  if(!candidates.length){box.innerHTML=`<b>🧬 Fingerprint monety</b><p>Wykryto ${featureCount} cech diagnostycznych. Biblioteka nie ma jeszcze co najmniej 3 wspólnych cech z innym wzorcem, więc APOMONET nie podaje sztucznej zgodności.</p>`;return}
  box.innerHTML='<b>🧬 Porównanie fingerprintu</b><p class="muted">Porównanie dotyczy cech stempla, nie podobieństwa całych fotografii.</p>'+candidates.map((x,i)=>{const m=x.match,c=[x.identity.ruler,x.identity.nominal,x.identity.year,x.identity.mint,x.identity.variant].filter(Boolean).join(' • ');const conflict=m.conflicts?.length?' • konflikty: '+m.conflicts.map(label).join(', '):'';return `<div style="padding:10px 0;border-top:1px solid #29292c"><strong>${i+1}. ${c||'Wzorzec'}</strong><br><span>${m.similarity}% • ${m.matchedFeatures} wspólnych cech • ${m.quality}${conflict}</span>${x.expertAccepted?'<br><small>✓ wzorzec zweryfikowany ekspercko</small>':x.ownerAccepted?'<br><small>zaakceptowany przez właściciela</small>':''}</div>`}).join('');
 }
 addEventListener('DOMContentLoaded',()=>{
  if(!location.pathname.endsWith('analyze.html'))return;
  const deep=$('deep'); if(!deep)return;
  deep.addEventListener('click',()=>{let n=0;const t=setInterval(()=>{n++;render();const a=globalAnalysis();if(a?.detail?.fingerprint||n>80)clearInterval(t)},150)});
  setTimeout(render,500);
 });
})();
