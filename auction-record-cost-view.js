(()=>{
  function money(v,c='PLN'){const n=Number(v);return Number.isFinite(n)&&n>0?`${Math.round(n*100)/100} ${c}`:'—'}
  function summarize(record={},extra={}){
    const currency=record.currency||extra.currency||'PLN';
    const resultBasis=window.ApoArchive?.priceBasis?.(record)||'unknown';
    const resultValue=resultBasis==='hammer'?record.hammerPrice:resultBasis==='realized'?record.realizedPrice:resultBasis==='total'?record.totalPrice:record.price;
    const hammer=Number(record.hammerPrice||0);
    const cost=hammer&&window.ApoAuctionCost?.calculateForHouse?ApoAuctionCost.calculateForHouse({hammer,auctionHouse:record.auctionHouse||record.sourceLabel||record.source,saleDate:record.soldAt,currency,shipping:extra.shipping,insurance:extra.insurance,customsPct:extra.customsPct,importVatPct:extra.importVatPct,other:extra.other,fxRate:extra.fxRate}):{complete:false,total:null,note:'Koszt zakupu można policzyć dopiero przy znanej cenie młotkowej i zweryfikowanej regule domu aukcyjnego.'};
    return{result:{basis:resultBasis,value:resultValue,currency,label:resultBasis==='hammer'?'Cena młotkowa':resultBasis==='realized'?'Cena realizacji':resultBasis==='total'?'Cena całkowita':'Cena z archiwum',formatted:money(resultValue,currency)},buyerCost:cost.complete?{complete:true,total:cost.total,totalHome:cost.totalHome,currency,formatted:money(cost.total,currency),buyerPremium:cost.buyerPremium,premiumVat:cost.premiumVat,shipping:cost.shipping,insurance:cost.insurance,customs:cost.customs,importVat:cost.importVat,other:cost.other,ruleCheckedAt:cost.ruleCheckedAt,ruleSourceUrl:cost.ruleSourceUrl,note:cost.note}:{complete:false,total:null,currency,note:cost.note}};
  }
  window.ApoAuctionRecordCost={summarize};
})();
