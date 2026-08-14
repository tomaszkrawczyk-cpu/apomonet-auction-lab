const ALLOWED_HOSTS=new Set(['wcn.pl','www.wcn.pl']);
const MAX_BYTES=700000;
function text(s=''){return String(s).replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&').replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/\s+/g,' ').trim()}
function field(html,label){const re=new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\s*:<\\/?[^>]*>?(?:\\s|&nbsp;)*<[^>]*>([\\s\\S]*?)<\\/','i');const m=html.match(re);if(m)return text(m[1]);const plain=text(html),p=new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\s*:\\s*([^|]{1,180})','i').exec(plain);return p?String(p[1]).trim():''}
function parsePrice(v=''){const n=String(v).replace(/[^0-9,\.]/g,'').replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.');return Number(n)||0}
function parseDate(v=''){const m=String(v).match(/(\d{2})[-.](\d{2})[-.](\d{4})/);return m?`${m[3]}-${m[2]}-${m[1]}`:''}
function parseWcn(html,url){const u=new URL(url),id=(u.pathname.match(/^\/archive\/(\d+)\/?$/)||[])[1];if(!id)throw new Error('Dozwolona jest pojedyncza karta WCN /archive/NUMER.');const priceRaw=field(html,'Sell price')||field(html,'Cena sprzedaży')||field(html,'Cena');const dateRaw=field(html,'Sell date')||field(html,'Data sprzedaży')||field(html,'Data');const grade=field(html,'Grade')||field(html,'Stan');const lot=field(html,'Lot number')||field(html,'Numer pozycji')||id;const price=parsePrice(priceRaw),soldAt=parseDate(dateRaw);if(!price||!soldAt)throw new Error('Nie udało się jednoznacznie odczytać ceny i daty sprzedaży z tej karty WCN.');return{id:`wcn_${lot||id}`,source:'WCN',sourceId:String(lot||id),sourceUrl:`https://wcn.pl/archive/${id}`,auctionHouse:'WCN',soldAt,hammerPrice:price,totalPrice:null,price:price,currency:/€|EUR/i.test(priceRaw)?'EUR':/\$|USD/i.test(priceRaw)?'USD':'PLN',grade:grade||'',priceType:'realized',marketFact:true,accessMode:'public_single_record',rightsBasis:'public factual market observation',observedAt:new Date().toISOString()}}
module.exports=async function handler(req,res){
  if(req.method==='GET'&&String(req.query?.health||'')==='1')return res.status(200).json({ok:true,adapter:'WCN_SINGLE_RECORD',allowedHosts:[...ALLOWED_HOSTS],allowedPath:'/archive/{numeric_id}',storesDescriptions:false,storesImages:false});
  if(!['POST','GET'].includes(req.method))return res.status(405).json({error:'Method not allowed'});
  try{
    const raw=String(req.method==='POST'?req.body?.url:req.query?.url||'').trim();if(!raw)return res.status(400).json({error:'Brak URL.'});
    const u=new URL(raw);if(u.protocol!=='https:'||!ALLOWED_HOSTS.has(u.hostname.toLowerCase()))return res.status(400).json({error:'Ten adapter obsługuje obecnie wyłącznie publiczne karty WCN.'});
    if(!/^\/archive\/\d+\/?$/.test(u.pathname))return res.status(400).json({error:'Podaj bezpośredni URL pojedynczej pozycji WCN, np. /archive/344688.'});
    const c=new AbortController(),timer=setTimeout(()=>c.abort(),8000);const r=await fetch(u.toString(),{signal:c.signal,redirect:'follow',headers:{'user-agent':'APOMONET/0.1 factual-market-observation; single-record fetch','accept':'text/html'}});clearTimeout(timer);
    if(!r.ok)return res.status(502).json({error:`Źródło zwróciło HTTP ${r.status}.`});const len=Number(r.headers.get('content-length')||0);if(len>MAX_BYTES)return res.status(413).json({error:'Karta źródłowa jest zbyt duża dla kontrolowanego importera.'});
    const html=await r.text();if(html.length>MAX_BYTES)return res.status(413).json({error:'Karta źródłowa jest zbyt duża dla kontrolowanego importera.'});
    return res.status(200).json({ok:true,fact:parseWcn(html,u.toString()),storedFields:['source','sourceId','sourceUrl','auctionHouse','soldAt','hammerPrice','currency','grade'],discarded:['description','images','layout']});
  }catch(e){return res.status(400).json({error:e?.name==='AbortError'?'Przekroczono czas pobierania źródła.':String(e?.message||e)})}
}
