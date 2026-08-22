(()=>{
  const clean=v=>String(v??'').trim();
  const num=v=>Number(String(v??'').replace(',','.'))||0;
  function assess(r={}){
    const checks={source:!!clean(r.source),sourceUrl:/^https?:\/\//i.test(clean(r.sourceUrl)),soldAt:!!clean(r.soldAt),currency:!!clean(r.currency),price:num(r.hammerPrice||r.realizedPrice||r.totalPrice||r.price)>0,identity:!!(clean(r.ruler)&&clean(r.nominal)),specific:!!(clean(r.kopickiReference||r.catalog)||clean(r.variant)),grade:!!clean(r.grade)};
    let score=0;if(checks.source)score+=10;if(checks.sourceUrl)score+=20;if(checks.soldAt)score+=15;if(checks.currency)score+=10;if(checks.price)score+=20;if(checks.identity)score+=15;if(checks.specific)score+=7;if(checks.grade)score+=3;
    const level=score>=85?'strong':score>=65?'usable':score>=45?'limited':'weak';
    return{score,level,checks,completeCore:checks.source&&checks.sourceUrl&&checks.soldAt&&checks.currency&&checks.price&&checks.identity};
  }
  function enrich(r){const q=assess(r);return{...r,evidenceQuality:q.level,evidenceQualityScore:q.score,evidenceChecks:q.checks,evidenceCompleteCore:q.completeCore}}
  window.ApoAuctionSourceQuality={assess,enrich};
})();
