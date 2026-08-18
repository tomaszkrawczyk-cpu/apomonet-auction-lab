# APOMONET Knowledge Builder — polityka źródeł v4

Cel: budować własną bazę wiedzy numizmatycznej i faktów rynkowych bez kopiowania cudzych zdjęć, opisów aukcyjnych, układu katalogów ani odtwarzania chronionych baz.

## Zasada główna
Publicznie widoczny fakt nie jest automatycznie „zakazany”, ale publiczny dostęp nie oznacza też zgody na masowe skopiowanie bazy. APOMONET rozdziela:
1. odczyt i zapis pojedynczych znormalizowanych faktów,
2. eksplorację tekstów i danych (TDM),
3. masowy import/harvesting całego archiwum,
4. kopiowanie materiałów chronionych (zdjęcia/opisy).

## Dozwolony rekord APOMONET
Możemy przechowywać własny znormalizowany rekord faktograficzny, np.: kraj/emitent, władca, rok, nominał, mennica, metal, masa, średnica, wariant/odmiana, cechy odróżniające opisane własnymi słowami, znak menniczy, wariant legendy jako krótki fakt, typ rantu, numer katalogowy, rzadkość jeśli wiarygodna, data aukcji/sprzedaży, cena młotkowa, cena z opłatami jeśli publiczna, waluta, dom aukcyjny, numer aukcji/lotu oraz URL/identyfikator źródła jako provenance.

Nie kopiujemy do naszej bazy: zdjęć źródłowych bez licencji/zgody, skanów, pełnych opisów katalogowych, autorskich komentarzy, marketingowych sformułowań ani struktury/układu cudzej bazy.

## Literatura specjalistyczna — dozwolone tryby
1. PUBLIC_DOMAIN/OPEN_LICENSE — import i wykorzystanie zgodnie z prawami konkretnego wydania/obiektu.
2. REFERENCE_ONLY — bibliografia, numer katalogowy i wskazanie strony; bez kopiowania opisu, tabeli, zdjęcia ani układu katalogu.
3. MANUAL_FACT_EXTRACTION — ekspert zapisuje pojedyncze fakty własnymi słowami z provenance; publikacja wymaga niezależnego potwierdzenia lub statusu expertVerified.
4. TDM_EPHEMERAL — zautomatyzowana analiza legalnie dostępnego materiału tylko po sprawdzeniu zastrzeżenia TDM; kopia robocza nie trafia do produktu i jest przechowywana wyłącznie tak długo, jak to konieczne.
5. LICENSED_IMPORT — szerszy import wyłącznie w granicach pisemnej licencji/zgody z osobno określonym tekstem, tabelami, numeracją, obrazami, AI/TDM, retencją i komercyjnym użyciem.
6. USER_OR_EXPERT_CONTRIBUTION — własne zdjęcia i opracowania autora wkładu, z oświadczeniem o prawach i licencją dla APOMONET; prywatny album nie oznacza zgody na uczenie.

Sam zakup książki daje własność egzemplarza, nie przenosi praw autorskich. Pojedyncza referencja katalogowa jest traktowana inaczej niż systematyczne odtworzenie pełnej mapy katalogu. Praktyka konkurencji jest dowodem modelu rynkowego, ale nie zastępuje naszej własnej podstawy prawnej.

## Legalne ponowne wykorzystanie zasobów publicznych
- POLONA: GREEN_ITEM_LEVEL dla obiektów oznaczonych jako domena publiczna lub z prawem do komercyjnego ponownego wykorzystania; status każdego obiektu zapisujemy osobno.
- Publiczne muzea, biblioteki i archiwa: API/metadane lub formalny wniosek o ponowne wykorzystanie informacji sektora publicznego; zapisujemy warunki, opłatę, atrybucję i zakres komercyjny.
- Muzeum Narodowe w Warszawie i podobne API: metadata może zasilać wyszukiwanie, ale odwzorowania cyfrowe podlegają kontroli pola praw każdego obiektu.
- Brak oznaczenia praw nie jest zgodą. Rekord trafia do HOLD do czasu item-level review albo odpowiedzi instytucji.

## Poziomy dostępu
### GREEN — automatyzacja dozwolona
Źródło ma otwartą licencję, publiczne API/feed pozwalający na taki użytek albo pisemną zgodę właściciela. Można budować adapter i importować dozwolone pola zgodnie z zakresem licencji/zgody.

### YELLOW — publiczne fakty / kontrolowana eksploracja
Można korzystać z publicznie dostępnych faktów i zapisywać własne rekordy z provenance. Automatyzacja wymaga sprawdzenia regulaminu, opt-out TDM/zastrzeżeń maszynowo czytelnych, robots/ograniczeń technicznych oraz prawa do bazy. Nie obchodzimy CAPTCHA, logowania, paywalla ani limitów. Nie odtwarzamy istotnej części cudzej bazy przez systematyczne pobieranie małych fragmentów.

### RED — brak automatycznego pobierania
Gdy regulamin wprost zakazuje harvestowania, automatycznego pobierania/agregowania lub wykorzystania materiałów, adapter pozostaje wyłączony do czasu uzyskania zgody. Publiczne linkowanie i ręczna weryfikacja są traktowane oddzielnie od automatycznego importu.

## Klasyfikacja robocza źródeł — 2026-08-14
- NumisBids: RED dla automatycznego harvestingu/storage — Terms of Use wprost zabraniają automatycznego przechowywania i harvestowania informacji. Możliwe ręczne źródło referencyjne/linkowe, bez automatycznego importera.
- Coinstrail: RED dla automatycznego wykorzystania materiałów bez zgody — regulamin zabrania kopiowania, powielania i wykorzystywania materiałów serwisu. Nie budujemy adaptera bez zgody.
- Niemczyk: RED dla automatycznego pobierania/agregowania bez pisemnej zgody — regulamin §15 wprost tego zabrania. Linkowanie jest dozwolone. Po pisemnej zgodzie źródło może przejść do GREEN w zakresie zgody.
- OneBid: YELLOW/PENDING — publiczne wyniki mogą służyć do ręcznego pozyskiwania faktów i provenance; przed masową automatyzacją potrzebna jest osobna weryfikacja regulaminu platformy i praw do konkretnego materiału. Zgoda domu aukcyjnego na jego własne materiały nie jest automatycznie zgodą na obciążanie infrastruktury OneBid.
- WCN: YELLOW/PENDING — publiczne fakty mogą służyć do ręcznej weryfikacji i własnych rekordów; masowy adapter dopiero po potwierdzeniu zasad automatycznego dostępu/licencji/zgody.
- źródła open-data / public-domain / API z odpowiednią licencją (np. wcześniej zatwierdzone Nomisma/Wikidata/Europeana/Smithsonian/Met w zakresie ich licencji): GREEN zgodnie z warunkami konkretnego źródła.
- Stary Sklep: obecnie YELLOW dla publicznych faktów; po uzyskaniu od właściciela pisemnej zgody i najlepiej bezpośredniego eksportu materiału — GREEN w dokładnym zakresie tej zgody. Materiał przekazany bezpośrednio jest preferowany wobec scrapowania OneBid.

## TDM i prawo baz danych
Polskie/UE przepisy przewidują wyjątki dla eksploracji tekstów i danych w określonych warunkach, ale uprawniony może zastrzec prawa, a odrębne prawo do baz danych może ograniczać ekstrakcję/reutilizację całości lub istotnej części. Także powtarzające się systematyczne pobieranie małych części może być niedozwolone, jeżeli jego skutek odtwarza istotną część bazy lub szkodzi normalnemu korzystaniu.

Dlatego TDM nie jest w APOMONET automatycznym „zielonym światłem” do scrapowania. Każdy adapter ma własny status i zapis podstawy korzystania.

## Fakty cenowe
Dla wyceny APOMONET zapisuje własne obserwacje rynku: identyfikacja monety + data + dom aukcyjny + cena + waluta + typ ceny (hammer/total) + URL/ID źródła. Nie kopiujemy opisu ani zdjęcia. Statystyki APOMONET (mediana, percentyle, zakres 10–90%, liczba porównań) są obliczane przez nas z dozwolonego zbioru obserwacji.

## Konsensus wiedzy numizmatycznej
Pojedynczy rekord aukcyjny jest obserwacją, nie prawdą katalogową. Fakt o odmianie/identyfikacji staje się Verified Knowledge, gdy jest potwierdzony przez co najmniej dwa niezależne dopuszczone źródła albo eksperta. Korekta eksperta/użytkownika jest zapisywana oddzielnie od pierwotnego wyniku AI.

## Warstwa hipotez społecznościowych
Publiczne fora, portale i blogi specjalistyczne są wartościowe jako mechanizm odkrywania. APOMONET może zapisać własne krótkie podsumowanie hipotezy, bezpośredni URL i checklistę diagnostyczną bez kopiowania zdjęć oraz pełnych wypowiedzi.

Taki rekord ma zawsze status `candidate`. Może wskazać alternatywną identyfikację, cechę stempla, pomiar, test materiału lub potrzebę ekspertyzy. Nie może sam zmienić pól analizy, podnieść confidence, ustalić rzadkości, potwierdzić autentyczności ani uruchomić wyceny. Promocja wymaga niezależnego źródła dopuszczonego do Knowledge Builder albo eksperta.

## Referencje wykonywane w czasie analizy
API z warunkami ograniczającymi retencję może służyć do bieżącego porównania bez trwałego kopiowania katalogu. Przykładowo Numista zwraca kandydatów z widocznym N# i atrybucją, ale APOMONET nie zapisuje ich metadanych w Verified Knowledge ani nie pobiera miniatur. Kandydat z runtime reference nie podnosi confidence i nie jest potwierdzeniem odmiany.

## Provenance i audyt
Każdy rekord importowany automatycznie musi mieć: source, sourceUrl/sourceId, publicationTitle/edition/ISBN i pageOrRecordId gdy dotyczy literatury, checkedAt/importedAt, accessMode (manual/api/feed/permission/tdm/publicSectorReuse), rightsHolder, rightsBasis/rightsStatement, commercialUse, allowedFields, attribution, expiry/reviewAt i opcjonalnie expertVerified. Dzięki temu możemy wyłączyć konkretne źródło bez utraty informacji o pochodzeniu rekordów.

## Zasady techniczne adapterów
- respektujemy logowanie, paywall, CAPTCHA, rate limits i blokady techniczne;
- nie obchodzimy zabezpieczeń;
- stosujemy throttling/cache i minimalizujemy liczbę żądań;
- przechowujemy tylko potrzebne pola;
- źródło RED nie może zasilać automatycznego importu;
- zmiana regulaminu/licencji może automatycznie przełączyć adapter w HOLD do ponownej weryfikacji.

Ta polityka jest regułą projektową, nie opinią prawną. Przy komercyjnym uruchomieniu masowych adapterów do cudzych baz wymagających interpretacji regulaminu/prawa wykonujemy osobny przegląd prawny.
