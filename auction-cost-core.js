(()=>{
  const RULES_KEY='apomonet_auction_fee_rules_v1';
  const n=v=>{const x=Number(String(v??0).replace(',','.'));return Number.isFinite(x)?x:0};
  const clean=v=>String(v??'').trim();

  function calculate(x={}){
    const hammer=n(x.hammer),buyerPremium=hammer*n(x.buyerPremiumPct)/100,premiumVat=buyerPremium*n(x.premiumVatPct)/100,shipping=n(x.shipping),insurance=n(x.insurance),other=n(x.other),customsBase=hammer+buyerPremium+premiumVat+shipping+insurance,customs=customsBase*n(x.customsPct)/100,importVatBase=customsBase+customs+other,importVat=importVatBase*n(x.importVatPct)/100,total=hammer+buyerPremium+premiumVat+shipping+insurance+customs+importVat+other,fx=n(x.fxRate)||1;
    return{hammer,buyerPremium,premiumVat,shipping,insurance,customs,importVat,other,total,totalHome:total*fx,fxRate:fx};
  }

  function seller(x={}){
    const hammer=n(x.hammer),fee=hammer*n(x.sellerFeePct)/100,feeVat=fee*n(x.sellerFeeVatPct)/100,other=n(x.sellerOther),net=hammer-fee-feeVat-other;
    return{hammer,fee,feeVat,other,net};
  }

  function loadRules(){
    try{const rows=JSON.parse(localStorage.getItem(RULES_KEY)||'[]');return Array.isArray(rows)?rows:[]}catch{return[]}
  }
  function saveRules(rows){localStorage.setItem(RULES_KEY,JSON.stringify(Array.isArray(rows)?rows:[]));return rows}
  function validRule(rule){
    return !!(clean(rule?.auctionHouse)&&clean(rule?.sourceUrl)&&clean(rule?.checkedAt)&&n(rule?.buyerPremiumPct)>=0&&n(rule?.premiumVatPct)>=0);
  }
  function upsertRule(rule){
    if(!validRule(rule))throw new Error('Reguła kosztów wymaga domu aukcyjnego, źródła, daty sprawdzenia oraz jawnych stawek.');
    const rows=loadRules();
    const id=clean(rule.id)||['fee',clean(rule.auctionHouse).toLowerCase().replace(/\s+/g,'-'),clean(rule.validFrom||rule.checkedAt)].join('_');
    const item={...rule,id,auctionHouse:clean(rule.auctionHouse),sourceUrl:clean(rule.sourceUrl),checkedAt:clean(rule.checkedAt),validFrom:clean(rule.validFrom),validTo:clean(rule.validTo),buyerPremiumPct:n(rule.buyerPremiumPct),premiumVatPct:n(rule.premiumVatPct),fixedFee:n(rule.fixedFee),currency:clean(rule.currency)||'PLN'};
    const index=rows.findIndex(x=>x.id===id);if(index>=0)rows[index]=item;else rows.push(item);saveRules(rows);return item;
  }
  function findRule(auctionHouse,date=new Date().toISOString().slice(0,10)){
    const name=clean(auctionHouse).toLowerCase();
    return loadRules().filter(r=>clean(r.auctionHouse).toLowerCase()===name&&(!r.validFrom||r.validFrom<=date)&&(!r.validTo||r.validTo>=date)).sort((a,b)=>String(b.checkedAt).localeCompare(String(a.checkedAt)))[0]||null;
  }
  function calculateForHouse(input={}){
    const hammer=n(input.hammer),rule=input.rule||findRule(input.auctionHouse,input.saleDate);
    if(!hammer)return{complete:false,hammer:0,total:null,note:'Brak ceny młotkowej.'};
    if(!rule)return{complete:false,hammer,total:null,note:'Brak zweryfikowanej reguły prowizji dla tego domu aukcyjnego. APOMONET nie zgaduje stawki.'};
    const result=calculate({
      hammer,
      buyerPremiumPct:rule.buyerPremiumPct,
      premiumVatPct:rule.premiumVatPct,
      shipping:input.shipping,
      insurance:input.insurance,
      customsPct:input.customsPct,
      importVatPct:input.importVatPct,
      other:n(input.other)+n(rule.fixedFee),
      fxRate:input.fxRate,
    });
    return{...result,complete:true,auctionHouse:rule.auctionHouse,currency:clean(input.currency)||rule.currency||'PLN',ruleId:rule.id,ruleCheckedAt:rule.checkedAt,ruleSourceUrl:rule.sourceUrl,note:'Koszt policzono według zweryfikowanej reguły domu aukcyjnego i podanych kosztów dodatkowych.'};
  }

  window.ApoAuctionCost={calculate,seller,loadRules,saveRules,validRule,upsertRule,findRule,calculateForHouse};
})();
