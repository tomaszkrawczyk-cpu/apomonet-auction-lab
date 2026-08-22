(()=>{
  const isAnalyze=()=>location.pathname.endsWith('analyze.html');
  const isEdit=()=>location.pathname.endsWith('coin-edit.html');
  const parse=k=>{try{return JSON.parse(sessionStorage.getItem(k)||'null')}catch{return null}};
  const clearPrevious=()=>{
    sessionStorage.removeItem('apomonetAnalysisSession');
    sessionStorage.removeItem('apomonetReturnToAnalysis');
    sessionStorage.removeItem('apomonetOpenAlbumAfterResume');
    sessionStorage.removeItem('apomonetAlbumPhotoPrep');
    sessionStorage.removeItem('apomonetOwnerAnswers');
    try{const key='apomonetAnalysisResilienceV1',state=JSON.parse(localStorage.getItem(key)||'{}');if(state&&typeof state==='object'){delete state.pending;delete state.recoveryCache;localStorage.setItem(key,JSON.stringify(state))}}catch{}
  };
  addEventListener('DOMContentLoaded',()=>{
    if(isAnalyze()){
      const qs=new URLSearchParams(location.search),resuming=qs.get('resume')==='1'||sessionStorage.getItem('apomonetReturnToAnalysis')==='1';
      if(!resuming){
        clearPrevious();
        // A fresh pair of photos must always create a fresh analysis record and fresh owner/recovery context.
        const inputs=[document.getElementById('obverseInput'),document.getElementById('reverseInput')].filter(Boolean);
        inputs.forEach(input=>input.addEventListener('change',()=>{
          clearPrevious();
          try{ if(typeof id!=='undefined') id=null; if(typeof a!=='undefined') a=null; }catch{}
        },{once:true,capture:true}));
      }
      // Never present 100% as AI certainty. Image-processing confidence is not identification confidence.
      const clamp=()=>{
        const el=document.getElementById('conf');if(!el)return;
        const m=el.textContent.match(/(\d+(?:[.,]\d+)?)\s*%/);if(!m)return;
        const n=Number(m[1].replace(',','.'));if(n>=100)el.textContent=el.textContent.replace(m[0],'95%');
      };
      new MutationObserver(clamp).observe(document.body,{subtree:true,childList:true,characterData:true});clamp();
    }
    if(isEdit()){
      const qs=new URLSearchParams(location.search),coinId=qs.get('id'),s=parse('apomonetAnalysisSession');
      // Fill from session only when it belongs to the exact coin being edited.
      if(s?.id&&coinId&&s.id!==coinId){
        sessionStorage.removeItem('apomonetAnalysisSession');
        sessionStorage.removeItem('apomonetReturnToAnalysis');
        sessionStorage.removeItem('apomonetAlbumPhotoPrep');
        sessionStorage.removeItem('apomonetOwnerAnswers');
      }
    }
  });
})();
