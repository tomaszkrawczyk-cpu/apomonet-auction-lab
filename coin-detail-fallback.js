(()=>{
  if(!location.pathname.endsWith('coin.html'))return;
  function render(){
    const id=new URLSearchParams(location.search).get('id');
    const coin=id&&window.ApoMonet?ApoMonet.getCoin(id):null;
    if(!coin)return;
    const detail=coin.detail&&typeof coin.detail==='object'?coin.detail:{};
    const topDescription=String(coin.description||coin.fullDescription||'').trim();
    const detailDescription=String(detail.fullDescription||'').trim();
    if(!topDescription&&detailDescription){
      const card=document.getElementById('descriptionCard'),text=document.getElementById('description');
      if(card&&text){text.textContent=detailDescription;card.hidden=false;}
    }
  }
  document.readyState==='loading'?addEventListener('DOMContentLoaded',()=>setTimeout(render,0)):setTimeout(render,0);
})();
