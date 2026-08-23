(()=>{
  const L={
    pl:{title:'Automatyczny import WCN wyłączony',note:'Zgodnie z aktualną polityką źródeł APOMONET nie pobiera automatycznie danych z WCN bez odrębnej zgody lub potwierdzonej podstawy prawnej. Możesz dodać pojedynczy fakt cenowy ręcznie poniżej i zachować bezpośredni link do źródła.',badge:'WCN • RĘCZNE FAKTY'},
    en:{title:'Automatic WCN import disabled',note:'Under the current APOMONET source policy, WCN data are not fetched automatically without separate permission or a confirmed legal basis. You can add an individual market fact manually below and keep a direct source link.',badge:'WCN • MANUAL FACTS'},
    de:{title:'Automatischer WCN-Import deaktiviert',note:'Gemäß der aktuellen APOMONET-Quellenrichtlinie werden WCN-Daten ohne gesonderte Genehmigung oder bestätigte Rechtsgrundlage nicht automatisch abgerufen. Einzelne Marktdaten können unten manuell mit direktem Quellenlink erfasst werden.',badge:'WCN • MANUELLE DATEN'},
    fr:{title:'Import automatique WCN désactivé',note:'Selon la politique actuelle des sources APOMONET, les données WCN ne sont pas récupérées automatiquement sans autorisation distincte ou base juridique confirmée. Vous pouvez saisir manuellement un fait de marché ci-dessous et conserver le lien direct vers la source.',badge:'WCN • DONNÉES MANUELLES'}
  };
  const lang=()=>window.ApoLanguageRegistry?.current?.()||window.ApoI18n?.current?.()||localStorage.getItem('apomonet_language_v2')||'pl';
  const copy=()=>L[lang()]||L.en;
  function mount(){
    if(!location.pathname.endsWith('archive.html'))return;
    const button=document.getElementById('importBtn'),section=button?.closest('section.card');if(!section)return;
    const c=copy();section.dataset.sourceAutomation='disabled';section.innerHTML=`<div class="section-title"><h2>${c.title}</h2><span class="todo">${c.badge}</span></div><p class="source-note">${c.note}</p>`;
  }
  document.readyState==='loading'?addEventListener('DOMContentLoaded',mount):mount();
  ['languagechange','apo-language-changed','apomonet:language-change'].forEach(event=>addEventListener(event,mount));
  window.ApoWcnSourcePolicy=Object.freeze({enabled:false,mount});
})();
