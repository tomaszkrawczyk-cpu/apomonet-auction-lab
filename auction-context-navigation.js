(()=>{
  const norm=v=>String(v??'').trim();
  const L={pl:{check:'🔎 Sprawdź aukcje',searching:n=>`Szukasz notowań dla: ${n}`,started:'Wyszukiwanie uruchomione z karty monety.'},en:{check:'🔎 Check auctions',searching:n=>`Searching auction records for: ${n}`,started:'Search started from the coin card.'},de:{check:'🔎 Auktionen prüfen',searching:n=>`Auktionsdaten gesucht für: ${n}`,started:'Suche wurde von der Münzkarte gestartet.'},fr:{check:'🔎 Vérifier les enchères',searching:n=>`Recherche de résultats d’enchères pour : ${n}`,started:'Recherche lancée depuis la fiche monnaie.'}};
  const lang=()=>window.ApoLanguageRegistry?.current?.()||window.ApoI18n?.current?.()||localStorage.getItem('apomonet_language_v2')||'pl',t=k=>L[lang()]?.[k]||L.en[k]||L.pl[k]||k;
  const meaningful=v=>window.ApoCanonicalRecordSentinels?.isUnknown?!ApoCanonicalRecordSentinels.isUnknown(v):Boolean(norm(v)&&!['Nie ustalono','Not determined','Nicht bestimmt','Non déterminé'].includes(norm(v)));
  function coinQuery(coin){
    return [coin?.ruler,coin?.nominal,coin?.year,coin?.mint,coin?.variant]
      .map(norm).filter(meaningful).join(' ');
  }
  function archiveUrl(coin){
    const p=new URLSearchParams();
    if(coin?.id)p.set('coin',coin.id);
    const q=coinQuery(coin);if(q)p.set('q',q);
    return 'archive.html?'+p.toString();
  }
  function installCoinAction(){
    if(!location.pathname.endsWith('coin.html')||!window.ApoMonet)return;
    const id=new URLSearchParams(location.search).get('id'),coin=id?ApoMonet.getCoin(id):null;if(!coin)return;
    const toolbar=document.querySelector('#coinContent .toolbar');if(!toolbar)return;
    let a=document.getElementById('checkAuctionsForCoin');
    if(!a){a=document.createElement('a');a.id='checkAuctionsForCoin';a.className='btn secondary';const edit=document.getElementById('editLink');if(edit?.nextSibling)toolbar.insertBefore(a,edit.nextSibling);else toolbar.prepend(a)}
    a.href=archiveUrl(coin);a.textContent=t('check');
  }
  function restoreArchiveContext(){
    if(!location.pathname.endsWith('archive.html'))return;
    const params=new URLSearchParams(location.search),coinId=params.get('coin'),query=params.get('q');if(!coinId&&!query)return;
    let tries=0;const timer=setInterval(()=>{
      tries++;const select=document.getElementById('coinSelect'),q=document.getElementById('q'),btn=document.getElementById('searchBtn');
      if(select&&q&&btn){
        clearInterval(timer);if(coinId&&[...select.options].some(o=>o.value===coinId))select.value=coinId;if(query)q.value=query;btn.click();
        const coin=coinId&&window.ApoMonet?.getCoin?.(coinId);let status=document.getElementById('auctionContextStatus');if(!status){status=document.createElement('div');status.id='auctionContextStatus';status.className='status';document.querySelector('main .toolbar')?.after(status)}
        const name=coin?.title||coinQuery(coin);status.textContent=coin?t('searching')(name):t('started');
      }else if(tries>30)clearInterval(timer);
    },100);
  }
  window.ApoAuctionContext={coinQuery,archiveUrl};
  function init(){installCoinAction();restoreArchiveContext()}
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init):init();
  ['languagechange','apo-language-changed','apomonet:language-change'].forEach(e=>addEventListener(e,()=>{installCoinAction();const status=document.getElementById('auctionContextStatus');if(status&&location.pathname.endsWith('archive.html')){const id=new URLSearchParams(location.search).get('coin'),coin=id&&window.ApoMonet?.getCoin?.(id),name=coin?.title||coinQuery(coin);status.textContent=coin?t('searching')(name):t('started')}}));
})();
