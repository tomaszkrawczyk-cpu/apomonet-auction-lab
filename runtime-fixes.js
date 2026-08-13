(()=>{function onReady(fn){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',fn);else fn()}
onReady(()=>{
 if(location.pathname.endsWith('coin-edit.html')){
  const ruler=document.getElementById('ruler');
  if(ruler&&!document.getElementById('metal')){const lab=document.createElement('label');lab.textContent='Metal';const input=document.createElement('input');input.className='input';input.id='metal';lab.appendChild(input);ruler.closest('label')?.after(lab)}
  let s;try{s=JSON.parse(sessionStorage.getItem('apomonetAnalysisSession')||'null')}catch{}
  const metal=document.getElementById('metal');if(metal&&s?.a?.metal&&!metal.value)metal.value=s.a.metal;
  if(window.ApoMonet&&metal){const old=window.ApoMonet.upsertCoin;window.ApoMonet.upsertCoin=c=>old({...c,metal:(metal.value||c.metal||'').trim()})}
 }
 if(location.pathname.endsWith('calendar.html')){
  const panel=document.querySelector('.favorite-panel');if(!panel)return;
  const KEY='apomonetCalendarPrefs';
  const ensure=()=>{const list=document.getElementById('favoriteList');if(!list||list.querySelector('[data-apomonet-stary="1"]'))return;let prefs={scope:'all',mode:'all',favorites:[]};try{prefs={...prefs,...JSON.parse(localStorage.getItem(KEY)||'{}')}}catch{}
   const name='Stary Sklep — Sylwester Kopyciński',b=document.createElement('button');b.className='fav-chip '+(prefs.favorites.includes(name)?'active':'');b.dataset.apomonetStary='1';b.textContent=(prefs.favorites.includes(name)?'★ ':'☆ ')+name;b.onclick=()=>{let p={scope:'all',mode:'all',favorites:[]};try{p={...p,...JSON.parse(localStorage.getItem(KEY)||'{}')}}catch{}const i=p.favorites.indexOf(name);i>=0?p.favorites.splice(i,1):p.favorites.push(name);localStorage.setItem(KEY,JSON.stringify(p));b.classList.toggle('active',i<0);b.textContent=(i<0?'★ ':'☆ ')+name};list.prepend(b)};ensure();new MutationObserver(ensure).observe(panel,{childList:true,subtree:true});
 }
});})();