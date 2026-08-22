(()=>{
  const median=vals=>{const a=[...vals].map(Number).filter(Number.isFinite).sort((x,y)=>x-y);if(!a.length)return 0;const m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2};
  function analyze(rows=[],basis=''){
    const value=r=>window.ApoArchive?.marketValue?.(r,basis)||0;
    const dated=rows.filter(r=>r?.soldAt&&value(r)>0).sort((a,b)=>new Date(b.soldAt)-new Date(a.soldAt));
    if(dated.length<4)return{direction:'insufficient',label:'Za mało danych do trendu',recentMedian:0,olderMedian:0,changePct:0,recentCount:0,olderCount:0};
    const now=Date.now(),recentCut=now-3*365.25*864e5,olderCut=now-10*365.25*864e5;
    const recent=dated.filter(r=>new Date(r.soldAt).getTime()>=recentCut),older=dated.filter(r=>{const t=new Date(r.soldAt).getTime();return t<recentCut&&t>=olderCut});
    if(recent.length<2||older.length<2)return{direction:'insufficient',label:'Za mało danych w obu okresach',recentMedian:median(recent.map(value)),olderMedian:median(older.map(value)),changePct:0,recentCount:recent.length,olderCount:older.length};
    const recentMedian=median(recent.map(value)),olderMedian=median(older.map(value));if(!(olderMedian>0))return{direction:'insufficient',label:'Brak podstawy porównawczej',recentMedian,olderMedian,changePct:0,recentCount:recent.length,olderCount:older.length};
    const changePct=Math.round(((recentMedian-olderMedian)/olderMedian)*100);let direction='stable',label='Rynek stabilny';if(changePct>=15){direction='up';label='Trend wzrostowy'}else if(changePct<=-15){direction='down';label='Trend spadkowy'}
    return{direction,label,recentMedian:Math.round(recentMedian),olderMedian:Math.round(olderMedian),changePct,recentCount:recent.length,olderCount:older.length,recentYears:3,historyYears:10};
  }
  window.ApoAuctionTrend={analyze};
})();
