(()=>{
  function percentile(vals,p){const a=[...vals].map(Number).filter(Number.isFinite).sort((x,y)=>x-y);if(!a.length)return 0;const i=(a.length-1)*p,l=Math.floor(i),h=Math.ceil(i);return a[l]+(a[h]-a[l])*(i-l)}
  function filter(rows=[],basis=''){
    const value=r=>window.ApoArchive?.marketValue?.(r,basis)||0;
    const usable=rows.filter(r=>value(r)>0);
    if(usable.length<4)return{rows:usable,outliers:[],method:'none',reason:'Za mało rekordów do bezpiecznego wykrywania wartości odstających.'};
    const vals=usable.map(value),q1=percentile(vals,.25),q3=percentile(vals,.75),iqr=q3-q1;
    if(!(iqr>0))return{rows:usable,outliers:[],method:'none',q1,q3,reason:'Brak rozrzutu pozwalającego wiarygodnie wykryć wartości odstające.'};
    const low=Math.max(0,q1-1.5*iqr),high=q3+1.5*iqr,kept=[],outliers=[];
    for(const r of usable)(value(r)<low||value(r)>high?outliers:kept).push(r);
    if(kept.length<2)return{rows:usable,outliers:[],method:'none',q1,q3,low,high,reason:'Filtr pozostawiłby zbyt mało danych, więc nie został zastosowany.'};
    return{rows:kept,outliers,method:'iqr-1.5',q1,q3,low,high,reason:outliers.length?`Wyłączono ${outliers.length} nietypowych wyników z obliczania widełek; pozostają widoczne jako fakty aukcyjne.`:'Nie wykryto odstających wyników.'};
  }
  window.ApoAuctionOutliers={filter,percentile};
})();
