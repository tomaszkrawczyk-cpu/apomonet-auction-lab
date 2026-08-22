(()=>{
  const norm=s=>String(s??'').toLowerCase().trim();
  function select(coin={}){
    const refs=[];
    const add=(id,role,reason)=>{if(!refs.some(x=>x.id===id))refs.push({id,role,reason})};
    // Kopicki remains a broad Polish catalog reference when a verified match exists.
    add('kopicki','reference','Szerokie odniesienie katalogowe dla monet polskich; pokazuj numer/rarity tylko z potwierdzonego dopasowania.');
    // Specialist literature is evidence-driven, not selected solely by year.
    if(coin.tyszkiewiczReference||coin.tyszkiewiczValue||coin.sourceEvidence?.tyszkiewicz)add('tyszkiewicz','specialist','Historyczne odniesienie specjalistyczne potwierdzone dla tej emisji; zachowaj oryginalną wartość katalogową i nie przeliczaj jej automatycznie na PLN.');
    if(coin.parchimowiczReference||coin.sourceEvidence?.parchimowicz)add('parchimowicz','specialist','Odniesienie Parchimowicza potwierdzone dla tej emisji/opracowania; nie zakładaj zastosowania wyłącznie na podstawie rocznika.');
    for(const x of coin.specialistReferences||[])if(x?.id)add(norm(x.id),'specialist',x.reason||'Zweryfikowane specjalistyczne odniesienie dla konkretnej emisji.');
    return{references:refs,method:'evidence-based',note:'Dobór literatury wynika z konkretnej emisji, odmiany i zweryfikowanych źródeł. Nie wybieraj katalogu wyłącznie na podstawie roku.'};
  }
  window.ApoCatalogLiteraturePolicy={select};
})();
