(()=>{
  function daysSince(value){const t=new Date(value||'').getTime();if(!Number.isFinite(t))return null;return Math.max(0,Math.floor((Date.now()-t)/86400000))}
  function assess(r={}){
    const stamp=r.verifiedAt||r.observedAt||r.updatedAt||'';
    const days=daysSince(stamp);
    if(days==null)return{level:'unknown',days:null,label:'Brak daty weryfikacji'};
    if(days<=30)return{level:'fresh',days,label:'Zweryfikowane niedawno'};
    if(days<=180)return{level:'aging',days,label:'Weryfikacja średnio świeża'};
    return{level:'stale',days,label:'Źródło dawno nieweryfikowane'};
  }
  function enrich(r){const f=assess(r);return{...r,sourceFreshness:f.level,sourceFreshnessDays:f.days,sourceFreshnessLabel:f.label}}
  window.ApoAuctionSourceFreshness={assess,enrich,daysSince};
})();
