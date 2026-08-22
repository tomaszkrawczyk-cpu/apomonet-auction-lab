(()=>{
  const legacySeeds=[
    {id:'polska-krolewska',name:'Polska królewska'},
    {id:'srebro',name:'Srebro'},
    {id:'do-opracowania',name:'Do opracowania'}
  ];
  const norm=v=>String(v||'').trim().toLocaleLowerCase('pl-PL');
  function run(){
    if(!window.ApoMonet)return;
    const s=ApoMonet.load();
    s.albums=Array.isArray(s.albums)?s.albums:[];
    const referenced=new Set((s.coins||[]).flatMap(c=>Array.isArray(c.albumIds)?c.albumIds:[]));
    let changed=false;
    s.albums=s.albums.filter(album=>{
      const legacy=legacySeeds.some(x=>album?.id===x.id&&norm(album?.name)===norm(x.name));
      if(legacy&&!referenced.has(album.id)){changed=true;return false}
      return true;
    });
    const defs=[
      {id:'my-album',name:'Mój album',description:'Moja główna kolekcja monet.',kind:'collection'},
      {id:'goals',name:'Moje cele',description:'Monety, których aktywnie szukam.',kind:'targets'},
      {id:'dreams',name:'Marzenia',description:'Monety, które chciałbym kiedyś zdobyć.',kind:'dreams'}
    ];
    for(const d of defs){
      const exists=s.albums.some(a=>a.id===d.id||a.kind===d.kind||norm(a.name)===norm(d.name));
      if(!exists){s.albums.push({...d,createdAt:new Date().toISOString(),systemDefault:true});changed=true}
    }
    if(changed)ApoMonet.save(s);
  }
  window.ApoDefaultAlbumsMigration=Object.freeze({legacySeeds,run});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();
})();
