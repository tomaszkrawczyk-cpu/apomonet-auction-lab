function clean(v){return String(v??'').trim()}
function entities(s){return String(s||'').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>')}
function tag(block,name){const m=String(block||'').match(new RegExp('<'+name+'(?:\\s[^>]*)?>([\\s\\S]*?)<\\/'+name+'>','i'));return m?entities(m[1].replace(/<!\[CDATA\[|\]\]>/g,'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim()):''}
module.exports=async function handler(req,res){
 if(req.method!=='GET')return res.status(405).json({ok:false,error:'GET only'});
 if(String(req.query?.health||'')==='1')return res.status(200).json({ok:true,source:'American Numismatic Society',mode:'ODbL_METADATA_SEARCH',storesImages:false});
 const q=clean(req.query?.q);if(!q)return res.status(400).json({ok:false,error:'Podaj q.'});
 try{const url='https://numismatics.org/search/apis/search?q='+encodeURIComponent(q)+'&format=rss',r=await fetch(url,{headers:{Accept:'application/rss+xml, application/xml;q=0.9'}});if(!r.ok)throw Error('ANS '+r.status);const xml=await r.text(),blocks=xml.match(/<item\b[\s\S]*?<\/item>/gi)||[],items=blocks.slice(0,20).map(b=>{const title=tag(b,'title'),link=tag(b,'link'),guid=tag(b,'guid');const id=(guid||link).split('/').filter(Boolean).pop()||'';return{source:'ANS',id,uri:link||guid,label:title,conceptType:'numismatic search result',provider:'American Numismatic Society',license:'ODbL',mediaReusable:false}}).filter(x=>x.id&&x.label);return res.status(200).json({ok:true,total:items.length,items,license:'ODbL',storesImages:false})}catch(e){return res.status(422).json({ok:false,error:e.message})}
}
