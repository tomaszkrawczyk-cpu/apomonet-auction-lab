# APOMONET — legalne wykorzystanie wiedzy i praktyki konkurencji
Data: 2026-08-15

## Cel
Ustalić, jak APOMONET może maksymalnie wykorzystać literaturę specjalistyczną, katalogi, publiczne zbiory i opisy aukcyjne bez budowania kopii cudzej książki lub bazy. To dokument operacyjny, nie indywidualna opinia prawna. Przed komercyjnym masowym importem źródła YELLOW/RED wymagają przeglądu prawnika własności intelektualnej.

## Wniosek wykonawczy
Nie istnieje jedna bezpieczna „luka”, która pozwala przepisać chroniony katalog. Istnieje jednak kilka mocnych legalnych dróg, które łącznie pozwalają zbudować bardzo wartościową bazę:
1. niezależnie zebrane fakty i własne opisy;
2. punktowe referencje katalogowe zamiast kopii katalogu;
3. domena publiczna i otwarte licencje z kontrolą praw na poziomie obiektu;
4. eksploracja tekstów i danych, gdy prawa nie zostały zastrzeżone, bez publikowania kopii;
5. formalne ponowne wykorzystanie informacji sektora publicznego;
6. materiały ekspertów i użytkowników z jasną licencją;
7. umowy z autorami, wydawcami i domami aukcyjnymi;
8. własny system identyfikatorów, opisów, statystyk i fingerprintów APOMONET.

## Legalne przewagi do wykorzystania

### 1. Fakt a forma wyrażenia
Prawo autorskie chroni twórczy sposób wyrażenia, a twórczy dobór i układ katalogu może być chroniony osobno. APOMONET może budować własne rekordy faktograficzne: władca, nominał, rok, mennica, metal, masa, średnica, rant, znak, wariant legendy, znane notowania. Opisy cech tworzymy od nowa, własnym językiem i według własnego modelu danych.

Podstawa: aktualny tekst ustawy o prawie autorskim:
https://eli.gov.pl/eli/DU/2025/24/ogl

### 2. Pojedyncza referencja zamiast odtworzenia katalogu
Pole „Kopicki nr …, wydanie …, strona …” może pełnić funkcję bibliograficznego odsyłacza. Nie importujemy pełnej tabeli relacji numer → wszystkie pola z jednego katalogu. Dla bezpieczeństwa publikowana identyfikacja ma pochodzić z własnego opisu oraz co najmniej drugiego źródła lub potwierdzenia eksperta.

### 3. Prawo baz danych
Legalny użytkownik publicznej bazy może wykorzystywać nieistotne części, ale nie może powtarzalnie pobierać małych fragmentów tak, aby odtworzyć bazę lub zaszkodzić jej normalnemu wykorzystaniu. Dlatego limit rekordów nie legalizuje automatycznie długotrwałego harvestingu.

Podstawa: art. 6–8 ustawy o ochronie baz danych:
https://eli.gov.pl/api/acts/DU/2024/1769/text.html

### 4. TDM — eksploracja tekstów i danych
Od 20 września 2024 r. polskie przepisy pozwalają zwielokrotniać rozpowszechnione utwory i bazy dla TDM, chyba że uprawniony wyraźnie zastrzegł inaczej. Kopie wolno przechowywać tylko tak długo, jak potrzebuje tego analiza. TDM nie daje prawa do pokazania użytkownikowi skanu, skopiowanego opisu ani cyfrowego substytutu książki. W APOMONET TDM jest narzędziem do wykrycia wzorców i budowy własnych hipotez, nie podstawą do kopiowania.

Podstawa:
https://eli.gov.pl/api/acts/DU/2024/1254/text.html

### 5. Domena publiczna i stare wydania
Prawa majątkowe co do zasady wygasają 70 lat po śmierci twórcy, licząc pełne lata według ustawy. Trzeba sprawdzić autorów, współautorów, nowe opracowanie, fotografie i redakcję konkretnego wydania. Stara treść może być public domain, a współczesne komentarze i zdjęcia nadal chronione.

### 6. POLONA
Biblioteka Narodowa wskazuje, że większość obiektów POLONY jest w domenie publicznej i oznacza prawa na poziomie obiektu; materiały domeny publicznej mogą być wykorzystywane także komercyjnie. To źródło do systematycznego audytu dawnych katalogów, czasopism i monografii numizmatycznych.

Oficjalne informacje:
https://www.bn.org.pl/aktualnosci/3395-jak-tworczo-wykorzystac-dziela-z-polonapl.html
https://bn.org.pl/uslugi/centrum-kompetencji/udostepnianie-zbiorow-cyfrowych/

### 7. Publiczne muzea, biblioteki i archiwa
Ustawa o otwartych danych pozwala składać wnioski o ponowne wykorzystanie informacji sektora publicznego, także w aplikacji/usłudze komercyjnej. Instytucja może określić warunki lub opłatę. Muzeum Narodowe w Warszawie publikuje oficjalne API i status praw na poziomie obiektu.

Podstawa i instrukcje:
https://eli.gov.pl/eli/DU/2021/1641/ogl
https://www.gov.pl/web/gov/wykorzystaj-informacje-sektora-publicznego2
https://cyfrowe.mnw.art.pl/pl/eseje/531

### 8. Materiał społeczności i ekspertów
Możemy przyjąć model podobny do encyklopedii społecznościowej: autor wkładu przekazuje własne zdjęcie lub własny opis, wskazuje źródła i udziela APOMONET licencji. Moderator/ekspert sprawdza rekord. Dane prywatnej kolekcji pozostają prywatne; wykorzystanie zdjęcia/korekty do warstwy uczącej wymaga osobnej, świadomej zgody.

### 9. Umowy bezpośrednie
Najczystsza droga dla opisów i zdjęć aukcyjnych to zgoda domu aukcyjnego i bezpośredni feed/eksport. Umowa musi rozdzielać: fakty, opisy, zdjęcia, historyczne wyniki, katalogowe referencje, AI/TDM, czas przechowywania i publiczne wyświetlanie.

## Analiza konkurencji — publicznie ujawnione modele

| Podmiot | Model korzystania z wiedzy | Dowód publiczny | Wniosek dla APOMONET |
|---|---|---|---|
| Numista | Katalog budowany przez społeczność z obserwacji i referencji literaturowych; administratorzy krzyżowo sprawdzają źródła; zdjęcia od członków i partnerów; kontrolowane API | https://en.numista.com/info.php ; https://en.numista.com/help/references-112.html ; https://en.numista.com/api/doc/index.php | Własny identyfikator APOMONET + wiele referencji zewnętrznych + ekspert/moderator + partnerzy zdjęciowi |
| Numista — ochrona własnej bazy | Pozwala czytać i używać API na warunkach, ale zabrania istotnej/powtarzalnej ekstrakcji i scrapingu | https://en.numista.com/conditions.php | Nie kopiować Numisty; naśladować jej model organizacyjny |
| NGC/PMG | Najpierw wyłączna umowa z właścicielem NumisMaster/Krause, następnie w 2026 r. przejęcie katalogów KM i Pick | https://www.ngccoin.com/news/article/2143/World-coin-price-guide/ ; https://www.ngccoin.com/news/article/15389/ngc-pmg-acquire-km-pick-catalogs/ | Kluczowe katalogi są aktywem licencyjnym; docelowo licencja/partnerstwo, nie scraping |
| CoinArchives | Importuje pełne katalogi aukcyjne tylko za zgodą firmy, która je stworzyła; prawa pozostają u właściciela | https://www.coinarchives.com/faq.php | Zgody bezpośrednie od domów aukcyjnych i przejrzyste oznaczenie praw |
| acsearch | Publicznie udostępnia archiwum, ale regulamin zakazuje scraperów, systematycznego zbierania i kopiowania bez zgody | https://www.acsearch.info/terms.html | Publiczny dostęp nie jest podstawą importu |
| Coinoscope | Własna baza dopasowań; regulamin pozwala wykorzystywać przesłane zdjęcia do ulepszania modelu i informuje o zewnętrznym AI; dokładność nie jest gwarantowana | https://coinoscope.com/terms.html | APOMONET powinien mieć wyraźny, lecz bardziej prywatny model zgody na zdjęcia i osobną zgodę na uczenie |
| Maktun | Deklaruje duży katalog i analizę danych rynkowych, ale na zbadanych oficjalnych stronach nie ujawnia szczegółowej podstawy źródłowej | https://maktun.com/ ; https://maktun.com/faq | Brak ujawnienia nie jest dowodem legalności ani modelem do kopiowania |

Uwaga: obserwowana praktyka konkurenta nie daje APOMONET licencji. Jest tropem organizacyjnym, który musi mieć własną podstawę prawną.

## Macierz decyzyjna APOMONET

### GREEN
- własne zdjęcie użytkownika w jego prywatnym albumie;
- własny opis i niezależnie zweryfikowane fakty;
- item oznaczony public domain/CC0/odpowiednią otwartą licencją;
- oficjalne API zgodne z komercyjnym zakresem;
- pisemna zgoda autora, wydawcy lub domu aukcyjnego;
- informacja sektora publicznego przekazana do ponownego wykorzystania.

### YELLOW
- pojedynczy numer katalogowy i rzadkość;
- jeden publiczny rekord aukcyjny jako fakt z linkiem;
- TDM bez zakończonego sprawdzenia zastrzeżeń;
- muzealny rekord bez jednoznacznych praw do obrazu;
- ręcznie przepisany fakt bez drugiego źródła.

### RED
- skan lub OCR całego współczesnego katalogu przechowywany w produkcie;
- skopiowane opisy, tabele i fotografie bez licencji;
- systematyczne odtworzenie całej numeracji/struktury katalogu;
- scraping wbrew regulaminowi, robots, paywallowi, CAPTCHA lub blokadom;
- użycie prywatnych zdjęć kolekcjonera do uczenia bez osobnej zgody.

## Zadania wdrożeniowe
1. Zbudować Rights Ledger dla tytułu, wydania i konkretnego rekordu.
2. Nadać każdemu typowi monety własny trwały APOMONET ID.
3. Dodać maks. 10 zewnętrznych referencji katalogowych jako odsyłacze.
4. Wprowadzić obowiązkowe pola: źródło, wydanie, strona/rekord, sposób dostępu, podstawa prawna i data kontroli.
5. Uruchomić kolejkę ekspert → drugie źródło → Verified Knowledge.
6. Przygotować wzory zgód dla autora/wydawcy, domu aukcyjnego, eksperta i użytkownika.
7. Przeszukać POLONĘ pod kątem dawnych katalogów i czasopism numizmatycznych z domeny publicznej.
8. Złożyć pilotażowe wnioski do wybranych muzeów/bibliotek o komercyjne ponowne wykorzystanie danych numizmatycznych.
9. Nie wdrażać masowego adaptera do źródła YELLOW/RED bez zapisu praw i warunków.
10. Przed premierą przeprowadzić audyt prawny 10 najważniejszych tytułów, zaczynając od Kopickiego oraz monografii polskich talarów i odmian.
