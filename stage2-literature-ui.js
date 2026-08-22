(()=>{
  if(!location.pathname.endsWith('analyze.html'))return;
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function render(payload=window.__apoConfirmedStage2Literature){
    const panel=document.getElementById('deepPanel'),text=document.getElementById('deepText');if(!panel||!text)return;
    let box=document.getElementById('stage2Literature');
    if(!box){box=document.createElement('div');box.id='stage2Literature';box.className='detail';text.after(box)}
    const refs=payload?.references||[];
    if(!refs.length){box.innerHTML='<b>Literatura i katalogi</b><p class="muted">Brak potwierdzonego odniesienia katalogowego dla tej analizy. APOMONET nie dopisuje katalogu na podstawie samego rocznika.</p>';return}
    const rows=refs.map(r=>{const rarity=r.rarity?` <span class="muted">• rzadkość ${esc(r.rarity)}</span>`:'';const hist=r.historicalValue?`<small style="display:block;margin-top:4px">Historyczna wartość katalogowa: ${esc(r.historicalValue)} — nie jest to współczesna wycena PLN.</small>`:'';return `<div style="margin-top:10px"><strong>${esc(r.label)}</strong>: ${esc(r.value)}${rarity}${hist}</div>`}).join('');
    box.innerHTML='<b>Literatura i katalogi</b><p class="muted">Pokazano wyłącznie odniesienia potwierdzone w analizie szczegółowej.</p>'+rows;
  }
  window.addEventListener('apo-stage2-literature',e=>render(e.detail));
  const init=()=>{if(window.__apoConfirmedStage2Literature)render()};
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init):init();
})();
