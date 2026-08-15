(()=>{
  if(!location.pathname.endsWith('analyze.html'))return;
  addEventListener('DOMContentLoaded',()=>{
    // Nie nadpisuj processCoin z analyze.html. Właściwy pipeline wykrywa monetę,
    // wycina otoczenie i wysyła lekki kadr 640x640. Poprzedni hotfix wysyłał
    // całe zdjęcie 1200 px, co pogarszało stabilność transportu i rozpoznanie.

    // Po powrocie z korekty odtwórz miniatury ze ZAPISANEGO rekordu monety.
    // Dużych obrazów AI nie zapisujemy w sessionStorage; po wznowieniu wystarczą
    // obrazy rekordu jako kontekst do dalszego etapu, bez ponownego wyboru plików.
    try{
      const qs=new URLSearchParams(location.search),resume=qs.get('resume')==='1'||sessionStorage.getItem('apomonetReturnToAnalysis')==='1';
      if(resume){
        const s=JSON.parse(sessionStorage.getItem('apomonetAnalysisSession')||'null');
        const c=s?.id&&window.ApoMonet?ApoMonet.getCoin(s.id):null;
        if(c&&(c.obverseImage||c.reverseImage)){
          const patched={...s,imgs:[c.obverseImage||null,c.reverseImage||null]};
          delete patched.analysisImgs;
          sessionStorage.setItem('apomonetAnalysisSession',JSON.stringify(patched));
        }
      }
    }catch(e){console.warn('ApoMonet image session restore',e)}
  });
})();
