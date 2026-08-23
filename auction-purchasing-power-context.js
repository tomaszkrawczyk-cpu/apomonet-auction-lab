(()=>{
 const num=v=>Number(String(v??'').replace(',','.'))||0;
 function assess(r={},value){const amount=num(value??r.realizedPrice??r.hammerPrice??r.totalPrice??r.price),factor=num(r.inflationFactorToPresent),source=String(r.inflationSource||'').trim(),referenceDate=String(r.inflationReferenceDate||r.inflationAsOf||'').trim();if(!amount||!factor||!source||!referenceDate)return{available:false,presentValue:0,adjustedValue:0,label:'Brak zweryfikowanego kontekstu siły nabywczej'};const presentValue=amount*factor;return{available:true,presentValue,adjustedValue:presentValue,label:`Kontekst siły nabywczej: ×${factor} (${source}, ${referenceDate})`,source,referenceDate,date:referenceDate,factor}}
 function note(r={}){const a=assess(r);if(!a.available)return'';return `Historyczna cena nominalna pozostaje bez zmian. Dzisiejszy odpowiednik siły nabywczej: ${Math.round(a.adjustedValue)} ${String(r.currency||'').toUpperCase()}. To wyłącznie kontekst ekonomiczny i nie jest używane do wyceny monety.`}
 window.ApoAuctionPurchasingPower={assess,note};
})();
