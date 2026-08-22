(()=>{
  if(!location.pathname.endsWith('coin.html'))return;
  addEventListener('DOMContentLoaded',()=>{
    const id=new URLSearchParams(location.search).get('id');
    const coin=id&&window.ApoMonet?ApoMonet.getCoin(id):null;
    const facts=document.getElementById('facts');
    if(!coin||!facts)return;
    const detail=coin.detail&&typeof coin.detail==='object'?coin.detail:{};
    const candidate=detail.catalogCandidate&&typeof detail.catalogCandidate==='object'?detail.catalogCandidate:{};
    const rarity=detail.kopickiRarity||candidate.rarity||coin.rarity||'';
    const catalog=detail.kopickiReference||candidate.reference||coin.catalog||'';
    const variant=detail.variant||coin.variant||'';
    const boxes=[...facts.querySelectorAll('.fact')];
    const set=(index,value)=>{const strong=boxes[index]?.querySelector('strong');if(strong&&String(value||'').trim())strong.textContent=String(value).trim();};
    set(5,variant);
    set(7,rarity);
    set(8,catalog);
    if(!detail.kopickiReference&&candidate.reference){
      const strong=boxes[8]?.querySelector('strong');
      if(strong){strong.textContent=`${candidate.reference} — kandydat`;strong.title='Wymaga potwierdzenia katalogowego';}
    }
  });
})();
