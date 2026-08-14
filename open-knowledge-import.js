(()=>{
 async function getJSON(url){const r=await fetch(url);const j=await r.json().catch(()=>({}));if(!r.ok||j.ok===false)throw Error(j.error||`HTTP ${r.status}`);return j}
 async function importMetObject(id){const j=await getJSON(`/api/met-open-access?id=${encodeURIComponent(id)}`);return window.ApoMultiSource.ingest(j.record)}
 async function searchMet(q){return getJSON(`/api/met-open-access?q=${encodeURIComponent(q)}`)}
 async function importNomisma(id){const j=await getJSON(`/api/nomisma-open?id=${encodeURIComponent(id)}`);return window.ApoMultiSource.ingest(j.record)}
 function consensus(coin){
  const rows=window.ApoMultiSource?.evidence?.(coin)||[];
  const distinct=[...new Set(rows.map(x=>x.source))];
  const score=rows.reduce((s,x)=>s+Math.min(8,x.matchScore||0),0);
  return {records:rows.length,sources:distinct,sourceCount:distinct.length,confidenceBand:distinct.length>=3&&score>=18?'strong':distinct.length>=2&&score>=10?'supported':rows.length?'single-source':'none',evidence:rows};
 }
 window.ApoOpenKnowledge={importMetObject,searchMet,importNomisma,consensus};
})();