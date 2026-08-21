(()=>{
  if(!location.pathname.endsWith('analyze.html'))return;
  addEventListener('DOMContentLoaded',()=>{
    const save=document.getElementById('save');
    if(!save||save.dataset.apoOpenCard==='1')return;
    save.dataset.apoOpenCard='1';
    save.addEventListener('click',()=>{
      setTimeout(()=>{
        const link=document.getElementById('savedCoinLink');
        const href=link?.getAttribute('href')||'';
        if(/^coin\.html\?id=/.test(href))location.href=href;
      },80);
    });
  });
})();
