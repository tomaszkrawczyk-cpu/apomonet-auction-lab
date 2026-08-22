(()=>{
  const yearOf=x=>{const y=Number(x?.year);return Number.isFinite(y)?y:null};
  function route(coin={}){
    const y=yearOf(coin);
    if(y==null)return{primary:'kopicki',secondary:[],status:'unknown-year',note:'Brak pewnego rocznika — nie dobieraj automatycznie katalogu epokowego.'};
    if(y>=1506&&y<=1795)return{primary:'kopicki',secondary:['tyszkiewicz'],status:'old-polish',note:'Dla monet 1506–1795 pokaż dodatkowo odniesienie Tyszkiewicza w oryginalnej wartości katalogowej; nie przeliczaj automatycznie na współczesne PLN.'};
    if(y>=1916)return{primary:'parchimowicz',secondary:['kopicki'],status:'modern-polish',note:'Dla monet od 1916 priorytetem identyfikacyjnym i wycenowym jest Parchimowicz; Kopicki może pozostać dodatkowym odniesieniem, jeśli dotyczy.'};
    return{primary:'kopicki',secondary:[],status:'catalog-gap',note:'Zakres 1796–1915 wymaga odrębnych źródeł specjalistycznych; nie stosuj automatycznie Tyszkiewicza ani Parchimowicza.'};
  }
  window.ApoCatalogEraRouter={route};
})();
