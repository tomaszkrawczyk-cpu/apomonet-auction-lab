(()=>{
  if(!location.pathname.endsWith('analyze.html'))return;
  const loadImage=f=>new Promise((ok,no)=>{const r=new FileReader();r.onerror=no;r.onload=e=>{const im=new Image();im.onerror=no;im.onload=()=>ok(im);im.src=e.target.result};r.readAsDataURL(f)});
  const canvasData=(im,max,type,q)=>{const scale=Math.min(1,max/Math.max(im.width,im.height)),c=document.createElement('canvas');c.width=Math.max(1,Math.round(im.width*scale));c.height=Math.max(1,Math.round(im.height*scale));c.getContext('2d').drawImage(im,0,0,c.width,c.height);return c.toDataURL(type,q)};
  addEventListener('DOMContentLoaded',()=>{
    // Keep a small persistent preview for collection/album; keep a larger copy only for AI analysis.
    window.processCoin=async file=>{const im=await loadImage(file);return{display:canvasData(im,640,'image/webp',.76),analysis:canvasData(im,1200,'image/jpeg',.78),confidence:100}};

    // When a corrected session comes back without embedded images, restore previews from the saved coin.
    try{
      const qs=new URLSearchParams(location.search),resume=qs.get('resume')==='1';
      if(resume){
        const s=JSON.parse(sessionStorage.getItem('apomonetAnalysisSession')||'null');
        const c=s?.id&&window.ApoMonet?ApoMonet.getCoin(s.id):null;
        if(c&&(c.obverseImage||c.reverseImage)){
          const patched={...s,imgs:[c.obverseImage||null,c.reverseImage||null]};
          // Deliberately do not persist large analysis images in sessionStorage.
          delete patched.analysisImgs;
          sessionStorage.setItem('apomonetAnalysisSession',JSON.stringify(patched));
        }
      }
    }catch(e){console.warn('ApoMonet image session restore',e)}
  });
})();
