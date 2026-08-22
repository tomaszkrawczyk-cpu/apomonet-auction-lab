(()=>{
  if(!location.pathname.endsWith('analyze.html'))return;
  function install(){
    if(typeof window.processCoin==='function'&&!window.processCoin.__apoSideQueue){
      const original=window.processCoin.bind(window);
      const tails=[Promise.resolve(),Promise.resolve()];
      const sideOf=file=>{
        const ob=document.getElementById('obverseInput')?.files?.[0];
        const rev=document.getElementById('reverseInput')?.files?.[0];
        if(file&&ob===file)return 0;
        if(file&&rev===file)return 1;
        return -1;
      };
      const wrapped=function(file){
        const side=sideOf(file);
        if(side<0)return original(file);
        const run=()=>original(file);
        const next=tails[side].catch(()=>{}).then(run);
        tails[side]=next.catch(()=>{});
        return next;
      };
      wrapped.__apoSideQueue=true;
      wrapped.__apoOriginal=original;
      window.processCoin=wrapped;
      window.ApoPhotoSideQueue=Object.freeze({sideOf});
    }
    const swap=document.getElementById('swap');
    if(swap&&swap.dataset.apoAnalysisSwapGuard!=='1'){
      swap.dataset.apoAnalysisSwapGuard='1';
      swap.addEventListener('click',event=>{
        const analysisVisible=!document.getElementById('panel')?.classList.contains('hidden');
        if(!analysisVisible)return;
        event.preventDefault();
        event.stopImmediatePropagation();
      },{capture:true});
      const sync=()=>{const analysisVisible=!document.getElementById('panel')?.classList.contains('hidden');if(analysisVisible){swap.classList.add('hidden');swap.disabled=true}};
      const panel=document.getElementById('panel');if(panel)new MutationObserver(sync).observe(panel,{attributes:true,attributeFilter:['class']});sync();
    }
  }
  document.readyState==='loading'?addEventListener('DOMContentLoaded',install):install();
})();
