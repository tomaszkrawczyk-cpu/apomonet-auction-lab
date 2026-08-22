(()=>{
 const day=v=>{const d=new Date(v);return Number.isNaN(d.getTime())?null:d};
 function assess(r={}){const sold=day(r.soldAt),fx=day(r.fxDate);if(!sold||!fx)return{ok:false,days:null,label:'Brak daty sprzedaży lub kursu'};const days=Math.abs(Math.round((fx-sold)/86400000));return{ok:days<=3,days,label:days<=1?'Kurs z dnia sprzedaży / najbliższego dnia roboczego':days<=3?'Kurs bliski dacie sprzedaży':'Kurs zbyt odległy od daty sprzedaży'}}
 window.ApoAuctionFxDate={assess};
})();