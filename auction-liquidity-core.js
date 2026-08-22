(()=>{
  const now=()=>Date.now();
  const date=v=>{const d=new Date(v);return Number.isNaN(d.getTime())?null:d};
  function assess(rows=[],years=10){
    const valid=rows.map(r=>date(r.soldAt)).filter(Boolean).sort((a,b)=>a-b);
    if(!valid.length)return{level:'none',label:'Brak danych o płynności',count:0,activeYears:0,recentCount:0,annualRate:0};
    const yearsSet=new Set(valid.map(d=>d.getUTCFullYear()));
    const recentCut=now()-3*365.25*864e5;
    const recentCount=valid.filter(d=>d.getTime()>=recentCut).length;
    const annualRate=valid.length/Math.max(1,Number(years)||10);
    const activeYears=yearsSet.size;
    let level='low',label='Niska płynność rynku';
    if(valid.length>=12&&activeYears>=4&&recentCount>=4){level='high';label='Wysoka płynność rynku'}
    else if(valid.length>=5&&activeYears>=3&&recentCount>=2){level='medium';label='Umiarkowana płynność rynku'}
    return{level,label,count:valid.length,activeYears,recentCount,annualRate:Number(annualRate.toFixed(2)),periodYears:Number(years)||10};
  }
  window.ApoAuctionLiquidity={assess};
})();
