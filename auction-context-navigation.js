(()=>{
  const norm=v=>String(v??'').trim();
  function coinQuery(coin){
    return [coin?.ruler,coin?.nominal,coin?.year,coin?.mint,coin?.variant]
      .map(norm)
      .filter(v=>v&&v!=='Nie ustalono')
      .join(' ');
  }
  function archiveUrl(coin){
    const p=new URLSearchParams();
    if(coin?.id)p.set('coin',coin.id);
    const q=coinQuery(coin);if(q)p.set('q',q);
    return 'archive.html?'+p.toString();
  }
  function installCoinAction(){
    if(!location.pathname.endsWith('coin.html')||!window.ApoMonet)return;
    const id=new URLSearchParams(location.search).get('id'),coin=id?ApoMonet.getCoin(id):null;
    if(!coin)return;
    const toolbar=document.querySelector('#coinContent .toolbar');
    if(!toolbar||document.getElementById('checkAuctionsForCoin'))return;
    const a=document.createElement('a');
    a.id='checkAuctionsForCoin';a.className='btn secondary';a.href=archiveUrl(coin);
    a.textContent='🔎 Sprawdź aukcje';
    const edit=document.getElementById('editLink');
    if(edit?.nextSibling)toolbar.insertBefore(a,edit.nextSibling);else toolbar.prepend(a);
  }
  function restoreArchiveContext(){
    if(!location.pathname.endsWith('archive.html'))return;
    const params=new URLSearchParams(location.search),coinId=params.get('coin'),query=params.get('q');
    if(!coinId&&!query)return;
    let tries=0;
    const timer=setInterval(()=>{
      tries++;
      const select=document.getElementById('coinSelect'),q=document.getElementById('q'),btn=document.getElementById('searchBtn');
      if(select&&q&&btn){
        clearInterval(timer);
        if(coinId&&[...select.options].some(o=>o.value===coinId))select.value=coinId;
        if(query)q.value=query;
        btn.click();
        const coin=coinId&&window.ApoMonet?.getCoin?.(coinId);
        const status=document.createElement('div');
        status.id='auctionContextStatus';status.className='status';
        status.textContent=coin?`Szukasz notowań dla: ${coin.title||coinQuery(coin)}`:'Wyszukiwanie uruchomione z karty monety.';
        document.querySelector('main .toolbar')?.after(status);
      }else if(tries>30)clearInterval(timer);
    },100);
  }
  window.ApoAuctionContext={coinQuery,archiveUrl};
  function init(){installCoinAction();restoreArchiveContext()}
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init):init();
})();
