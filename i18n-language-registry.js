(()=>{
  const registry=new Map([
    ['pl',{code:'pl',label:'Polski',fallbacks:[]}],
    ['en',{code:'en',label:'English',fallbacks:['pl']}],
    ['de',{code:'de',label:'Deutsch',fallbacks:['en','pl']}],
    ['fr',{code:'fr',label:'Français',fallbacks:['en','pl']}],
  ]);
  function normalize(code){return String(code||'pl').toLowerCase().split('-')[0]}
  function register(code,meta={}){code=normalize(code);if(!code)return;registry.set(code,{code,label:meta.label||code.toUpperCase(),fallbacks:[...(meta.fallbacks||['en','pl'])]});window.dispatchEvent(new CustomEvent('apo-language-registry-changed',{detail:{code}}))}
  function get(code){return registry.get(normalize(code))||{code:normalize(code),label:String(code||'').toUpperCase(),fallbacks:['en','pl']}}
  function chain(code){const item=get(code),out=[item.code,...item.fallbacks.map(normalize)];if(!out.includes('pl'))out.push('pl');return [...new Set(out.filter(Boolean))]}
  function resolve(table,key,code){const row=table?.[key];if(row==null)return key;if(typeof row==='string')return row;for(const lang of chain(code)){const v=lang==='pl'?(row.pl??key):row[lang];if(v!==undefined&&v!==null&&String(v).trim()!=='')return v}return key}
  function languages(){return [...registry.values()]}
  window.ApoLanguageRegistry={register,get,chain,resolve,languages,normalize};
})();
