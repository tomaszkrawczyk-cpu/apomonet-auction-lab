(()=>{
 const num=v=>Number(String(v??'').replace(',','.'))||0;
 function assess(r={}){const amount=num(r.realizedPrice||r.hammerPrice||r.totalPrice||r.price);const factor=num(r.inflationFactorToPresent);const source=String(r.inflationSource||'').trim(),date=String(r.inflationAsOf||'').trim();if(!amount||!factor||!source||!date)return{available:false,adjustedValue:0,label:'Brak zweryfikowanego kontekstu siły nabywczej'};return{available:true,adjustedValue:amount*factor,label:`Kontekst siły nabywczej: ×${factor} (${source}, ${date})`,source,date,factor}}
 function note(r={}){const a=assess(r);if(!a.available)return'';return `Historyczna cena nominalna pozostaje bez zmian. Dzisiejszy odpowiednik siły nabywczej: ${Math.round(a.adjustedValue)} ${String(r.currency||'').toUpperCase()}. To wyłącznie kontekst ekonomiczny i nie jest używane do wyceny monety.`}
 window.ApoAuctionPurchasingPower={assess,note};
})();
