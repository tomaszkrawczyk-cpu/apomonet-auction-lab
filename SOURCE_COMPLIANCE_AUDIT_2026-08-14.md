# APOMONET — audyt źródeł wiedzy
Data: 2026-08-14

## Zasada nadrzędna
APOMONET nie kopiuje cudzych opisów ani zdjęć i nie buduje kopii cudzych baz. Knowledge Builder przyjmuje wyłącznie znormalizowane fakty ze źródeł, których ponowne użycie jest jasno dozwolone, albo po odrębnej zgodzie/licencji.

## 🟢 Źródła dopuszczone

### Nomisma.org
- Zakres: Nomisma concepts.
- Licencja: CC-BY.
- Automatyzacja: TAK, z atrybucją.
- Uwaga: zbiory partnerskie mają osobne licencje i wymagają osobnego audytu.
- Oficjalne źródło: https://www.nomisma.org/data/

### Wikidata
- Zakres: structured data z przestrzeni main/property/lexeme/entity schema.
- Licencja: CC0.
- Automatyzacja: TAK.
- Uwaga: tekst innych stron Wikidata nie jest traktowany jako CC0 structured data.
- Oficjalne źródło: https://www.wikidata.org/wiki/Wikidata:Licensing

### Europeana
- Zakres: metadata.
- Licencja metadata: CC0.
- Automatyzacja: TAK dla metadata.
- Uwaga: prawa do obiektu/preview/media są niezależne i są opisane przez edm:rights. APOMONET Knowledge Builder nie pobiera mediów.
- Oficjalne źródła: https://www.europeana.eu/en/rights/usage-guidelines-for-metadata ; https://pro.europeana.eu/page/the-data-exchange-agreement

### Smithsonian Open Access
- Zakres: wyłącznie rekordy i zasoby oznaczone CC0/Open Access.
- Licencja: CC0 dla oznaczonych zasobów.
- Automatyzacja: TAK przez oficjalne Open Access API/dataset.
- Oficjalne źródło: https://www.si.edu/openaccess/devtools

### The Metropolitan Museum of Art Open Access
- Zakres: basic collection data; media tylko oznaczone Open Access.
- Licencja: CC0.
- Automatyzacja: TAK przez oficjalne API/dataset.
- Oficjalne źródło: https://www.metmuseum.org/policies/image-resources

## 🟡 Źródła referencyjne / wymagające dodatkowego audytu

### POLONA
- Brak automatycznego importu do czasu jednoznacznego potwierdzenia praw konkretnego obiektu i zasad ponownego użycia.
- Użycie tylko po item-level review.

### WCN
- Serwis oznacza treści jako wszelkie prawa zastrzeżone.
- Brak automatycznego importu i brak zapisu do Knowledge Buildera bez wyraźnej zgody/licencji.

### OneBid
- Do czasu jednoznacznego potwierdzenia praw do systematycznego ponownego użycia danych: wyłącznie referencja, bez ingestu do Knowledge Buildera.

## 🔴 Źródła zablokowane bez zgody

### Niemczyk
- Regulamin zabrania kopiowania, reprodukowania, agregowania lub modyfikowania danych/informacji oraz automatycznego pobierania bez pisemnego zezwolenia.
- Oficjalne źródło: https://niemczyk.pl/niemczyk/regulamin

### NumisBids
- Terms: information accessed from the service may not be stored or harvested using automated means.
- Oficjalne źródło: https://www.numisbids.com/terms

### Coinstrail
- Terms ograniczają kopiowanie, reprodukowanie i używanie treści serwisu.
- Oficjalne źródło: https://coinstrail.com/terms-of-service

### Allegro
- Developer rules zabraniają m.in. ekstrakcji/scrapingu i wykorzystywania materiałów bez zgody Allegro.
- Oficjalne źródło: https://developer.allegro.pl/rules

## Zabezpieczenia techniczne
1. Knowledge Builder ma whitelistę źródeł.
2. Żółte i czerwone źródła nie mogą zapisać rekordu do warstwy uczącej.
3. Stare próbki WCN/OneBid zostały wycofane z seedów uczących.
4. Legacy localStorage jest migrowany tylko dla rekordów pochodzących ze źródeł aktualnie dopuszczonych.
5. Europeana/Smithsonian wymagają śladu praw/licencji na poziomie rekordu, gdy jest to potrzebne.
6. Verified Knowledge przyjmuje wyłącznie rekordy przechodzące przez aktualny Knowledge Builder.

## Zasada na przyszłość
Każde nowe źródło domyślnie otrzymuje status BLOCK/REVIEW. Status GREEN może otrzymać dopiero po wskazaniu oficjalnej licencji, regulaminu albo pisemnej zgody.