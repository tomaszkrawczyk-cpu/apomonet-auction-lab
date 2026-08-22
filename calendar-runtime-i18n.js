(()=>{
  if(!location.pathname.endsWith('calendar.html'))return;
  const lang=()=>window.ApoLanguageRegistry?.current?.()||window.ApoI18n?.current?.()||localStorage.getItem('apomonet_language_v2')||'pl';
  const locale=()=>({pl:'pl-PL',en:'en-GB',de:'de-DE',fr:'fr-FR'}[lang()]||'en-GB');
  const T={
    pl:{source:'Źródło:',domestic:'Polska',foreign:'Zagranica',remind:'Przypomnij 2 dni wcześniej',open:'Otwórz źródło',empty:'Brak nadchodzących aukcji pasujących do Twoich ustawień.',calendar:'APOMONET • Przypomnienie aukcji',alarm:'Za 2 dni',note:'Źródło'},
    en:{source:'Source:',domestic:'Poland',foreign:'International',remind:'Remind me 2 days earlier',open:'Open source',empty:'No upcoming auctions match your settings.',calendar:'APOMONET • Auction reminder',alarm:'In 2 days',note:'Source'},
    de:{source:'Quelle:',domestic:'Polen',foreign:'Ausland',remind:'2 Tage vorher erinnern',open:'Quelle öffnen',empty:'Keine kommenden Auktionen entsprechen Ihren Einstellungen.',calendar:'APOMONET • Auktionserinnerung',alarm:'In 2 Tagen',note:'Quelle'},
    fr:{source:'Source :',domestic:'Pologne',foreign:'Étranger',remind:'Rappeler 2 jours avant',open:'Ouvrir la source',empty:'Aucune enchère à venir ne correspond à vos réglages.',calendar:'APOMONET • Rappel d’enchère',alarm:'Dans 2 jours',note:'Source'}
  };
  const t=k=>T[lang()]?.[k]||T.en[k]||T.pl[k];
  const escICS=s=>String(s||'').replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');
  const icsDate=d=>new Date(d).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
  function patchDynamic(){
    document.querySelectorAll('.event .date').forEach((el,i)=>{try{const a=window.auctions?.filter?.(x=>new Date(x.date)>=new Date()&&window.allowed?.(x)).sort((a,b)=>new Date(a.date)-new Date(b.date))[i];if(a)el.textContent=new Intl.DateTimeFormat(locale(),{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(a.date))}catch{}});
    document.querySelectorAll('.event .source').forEach(el=>{const text=el.textContent.replace(/^Źródło:\s*/i,'').replace(/^Source:\s*/i,'').replace(/^Quelle:\s*/i,'');el.textContent=`${t('source')} ${text}`});
    document.querySelectorAll('.event .badge').forEach(el=>{if(['Polska','Poland','Polen','Pologne'].includes(el.textContent.trim()))el.textContent=t('domestic');else el.textContent=t('foreign')});
    document.querySelectorAll('.event .remind').forEach(el=>el.textContent=t('remind'));
    document.querySelectorAll('.event-actions a.btn').forEach(el=>el.textContent=t('open'));
    const empty=document.querySelector('#timeline .empty');if(empty)empty.textContent=t('empty');
  }
  function localizedReminder(a){
    if(!a)return;
    const start=new Date(a.date),end=new Date(start.getTime()+2*60*60*1000);
    const ics=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//APOMONET//Auction Reminder//EN','BEGIN:VEVENT','UID:'+a.id+'@apomonet','DTSTAMP:'+icsDate(new Date()),'DTSTART:'+icsDate(start),'DTEND:'+icsDate(end),'SUMMARY:'+escICS(a.house+' — '+a.title),'DESCRIPTION:'+escICS(`APOMONET • ${a.note} • ${t('note')}: ${a.source} • ${a.url}`),'URL:'+a.url,'BEGIN:VALARM','TRIGGER:-P2D','ACTION:DISPLAY','DESCRIPTION:'+escICS(`${t('alarm')}: ${a.house} — ${a.title}`),'END:VALARM','END:VEVENT','END:VCALENDAR'].join('\r\n');
    const blob=new Blob([ics],{type:'text/calendar;charset=utf-8'}),url=URL.createObjectURL(blob),x=document.createElement('a');x.href=url;x.download='APOMONET-'+a.id+'.ics';document.body.appendChild(x);x.click();x.remove();setTimeout(()=>URL.revokeObjectURL(url),1200);
  }
  function mount(){
    if(typeof window.fmt==='function')window.fmt=d=>new Intl.DateTimeFormat(locale(),{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(d));
    if(typeof window.reminder==='function')window.reminder=localizedReminder;
    if(typeof window.render==='function'){const base=window.render;window.render=function(){const out=base.apply(this,arguments);setTimeout(patchDynamic,0);return out};window.render()}
    else patchDynamic();
    const mo=new MutationObserver(()=>patchDynamic());const timeline=document.getElementById('timeline');if(timeline)mo.observe(timeline,{childList:true,subtree:true});
  }
  document.readyState==='loading'?addEventListener('DOMContentLoaded',mount):mount();
  ['languagechange','apo-language-changed','apomonet:language-change'].forEach(e=>addEventListener(e,()=>setTimeout(()=>{if(typeof window.render==='function')window.render();else patchDynamic()},0)));
  window.ApoCalendarRuntimeI18n={patchDynamic,localizedReminder,locale};
})();
