(()=>{
  if(!location.pathname.endsWith('auction-house.html'))return;
  const H={
    'stary-sklep':{name:'Stary Sklep — Sylwester Kopyciński',desc:'Partner testowy APOMONET. Aukcje i katalogi prowadzone przez OneBid.',site:'https://starysklep.onebid.pl/pl/index',auctions:'https://onebid.pl/pl/auctionslist/Stary-Sklep',contact:'stary-sklep@wp.pl',phone:'+48 513 508 430'},
    'wcn':{name:'Warszawskie Centrum Numizmatyczne',desc:'Warszawski dom numizmatyczny, sklep oraz aukcje stacjonarne i internetowe.',site:'https://wcn.pl/',auctions:'https://wcn.pl/auctions',contact:'moneta@wcn.pl',phone:'+48 22 625 67 97'},
    'niemczyk':{name:'Antykwariat Numizmatyczny Michał Niemczyk',desc:'Dom aukcyjny i antykwariat numizmatyczny w Warszawie.',site:'https://niemczyk.pl/',auctions:'https://aukcjamonet.pl/',archive:'https://archiwum.niemczyk.pl/',contact:'kontakt przez niemczyk.pl',phone:'+48 22 620 45 74'},
    'gndm':{name:'Marciniak / GNDM',desc:'Dom Aukcyjny Marciniak i Gabinet Numizmatyczny Damian Marciniak.',site:'https://marciniak.com/',auctions:'https://marciniak.com/',contact:'kontakt przez marciniak.com',phone:'+48 500 485 400'}
  };
  const id=new URLSearchParams(location.search).get('id'),h=H[id];
  if(!h)return;
  addEventListener('DOMContentLoaded',()=>{
    const hero=document.querySelector('.hero.compact');
    if(hero){hero.querySelector('h1').textContent=h.name;hero.querySelector('p').textContent=h.desc;}
    const cards=[...document.querySelectorAll('.grid .card')];
    const current=cards.find(c=>c.querySelector('h3')?.textContent.includes('Aktualne aukcje'));
    if(current)current.innerHTML=`<h3>Aktualne aukcje</h3><p>Otwórz oficjalną stronę z bieżącymi aukcjami tego domu.</p><a class="btn primary" href="${h.auctions}" target="_blank" rel="noopener">Otwórz aukcje</a>`;
    const archive=cards.find(c=>c.querySelector('h3')?.textContent.includes('Archiwum wyników'));
    if(archive)archive.innerHTML=h.archive?`<h3>Archiwum wyników</h3><p>Przejdź do oficjalnego archiwum domu aukcyjnego.</p><a class="btn secondary" href="${h.archive}" target="_blank" rel="noopener">Otwórz archiwum</a>`:`<h3>Archiwum wyników</h3><p>Wyniki i archiwalne aukcje sprawdzisz na stronie domu aukcyjnego.</p><a class="btn secondary" href="${h.site}" target="_blank" rel="noopener">Przejdź do strony</a>`;
    const contact=cards.find(c=>c.querySelector('h3')?.textContent.includes('Kontakt i linki'));
    if(contact)contact.innerHTML=`<h3>Kontakt i linki</h3><p>${h.phone}<br>${h.contact}</p><a class="btn secondary" href="${h.site}" target="_blank" rel="noopener">Strona WWW</a>`;
  });
})();
