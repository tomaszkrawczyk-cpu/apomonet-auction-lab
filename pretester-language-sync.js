(()=>{
 const KEY='apomonet_language_v2';
 let syncing=false;
 const current=()=>window.ApoLanguageRegistry?.current?.()||window.ApoI18n?.current?.()||localStorage.getItem(KEY)||'pl';
 function sync(){
  if(syncing)return;
  syncing=true;
  try{
   const l=current();
   if(localStorage.getItem(KEY)!==l)localStorage.setItem(KEY,l);
   document.documentElement.lang=l;
  }finally{syncing=false}
 }
 document.readyState==='loading'?document.addEventListener('DOMContentLoaded',sync):sync();
 ['languagechange','apo-language-changed','apomonet:language-change'].forEach(e=>addEventListener(e,()=>{sync();setTimeout(sync,0)}));
})();