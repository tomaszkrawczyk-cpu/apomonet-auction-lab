(()=>{function onReady(fn){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',fn);else fn()}
onReady(()=>{
 if(location.pathname.endsWith('analyze.html')){
  ['obverseInput','reverseInput'].forEach(id=>{const e=document.getElementById(id);if(e)e.removeAttribute('capture')});
 }
});})();