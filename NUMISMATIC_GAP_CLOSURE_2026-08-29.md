# APOMONET — raport domknięcia luk bazy (2026-08-29)

## Wynik

Pozytywny katalog runtime zawiera **22 149 egzemplarzy źródłowych**. Są teraz trwale przypisane do **2785 typów nadrzędnych**, **5926 emisji** i **6291 odmian**. **422 emisji** ma co najmniej dwa niezależne źródła, a **287 typów** pozostaje świadomie oznaczonych do ręcznej kontroli zamiast automatycznego scalenia. Osobny korpus negatywny ma **89 legalnych obrazów** i nie miesza się z identyfikacją pozytywną (wycieki: **0**).

### Korekta wcześniejszych liczników

Wartości „831 typów PRL” i „247 typów wieloźródłowych” nie były policzone tą samą jednostką. Obecny model rozróżnia: **typ nadrzędny** (rodzina katalogowa), **emisję** (rok/mennica), **odmianę** (metal i jawne cechy wariantu) oraz **egzemplarz źródłowy**. Po odrzuceniu fałszywych dat Europeany zakres PRL 1949–1989 ma **715 egzemplarzy**, **399 typów nadrzędnych**, **615 emisji** i **704 odmian**.

## Stan obszarów

| Obszar | Egzemplarze | Typy nadrzędne | Emisje | Odmiany | Para zdjęć | Wniosek |
|---|---:|---:|---:|---:|---:|---|
| PRL 1949–1989 | 715 | 399 | 615 | 704 | 10 | dane techniczne są znacznie mocniejsze niż legalna warstwa wizualna |
| II RP i wojna 1918–1945 | 272 | 70 | 138 | 148 | 171 | 10 rodzin ma rzeczywiście więcej niż jedną mennicę; nie wolno ich automatycznie scalać |
| Średniowiecze do 1385 | 896 | 167 | 249 | 250 | 803 | legendy IKMK poprawiły sito, ale nie zastępują typologii stempli |
| Jagiellonowie 1386–1572 | 8714 | 174 | 664 | 730 | 1871 | wymaga dalszej kontroli rodzin i aliasów |
| Monarchia elekcyjna 1573–1795 | 6696 | 523 | 2186 | 2321 | 2411 | mocny materiał egzemplarzowy; nadal potrzebna kontrola drzew |
| Zabory i powstania | 1715 | 218 | 620 | 651 | 780 | drzewa należy zatwierdzać gałąź po gałęzi |

## Co domknięto w tej partii

- Rozdzielono **16/16** wskazanych pozycji IKMK: srebrne ducato oraz wielokrotności od 3 do 30 dukatów nie są już spłaszczane do zwykłego „Dukata”.
- Zachowano faktyczne legendy awersu i rewersu IKMK z licencją CC BY-SA 4.0 oraz rekordowym źródłem; nie pobrano narracyjnych opisów.
- Utworzono odseparowany korpus: 72 obrazów falsyfikatów, 11 replik i 6 form odlewniczych; 15 grup ma rozpoznaną parę stron.
- Zablokowano daty Europeany od 1949 r. jako daty emisji. Europeana bywała źródłem daty digitalizacji, więc nie może konkurować z katalogami PRL/NBP.
- Kontrola dodatniego katalogu nie wykazała przejścia jawnych falsyfikatów/replik do kandydatów pozytywnych.
- Każdy rekord runtime ma trwałe identyfikatory: `coinTypeId`, `issueId`, `varietyId` i `specimenId`. Silnik konsoliduje teraz aliasy źródeł po `issueId`, zamiast tworzyć kilka wyników przez różne pisownie władcy lub mennicy.
- Utworzono prawnie odseparowany indeks **9 kolekcji i skarbu**, obejmujący pięć katalogów historycznych, MNW Potockich/Sobańskiego, Zbichorskiego i skarb z Koszyc. Zarejestrowano **3 kandydackie krawędzie proweniencji**; żadna nie została automatycznie uznana za tożsamość monety.
- Przejrzano **8 dawnych katalogów i periodyków** z osobną decyzją dla faktów i obrazów. Z otwartego skanu Spinka 1900 przeszukano **707 stron** i wytypowano **79 stron**; **75** pozostaje wyłącznie w kolejce, a jeden znormalizowany fakt wszedł do runtime dopiero po zgodności z MNK i MNW. **1578 pozycji polskich** z katalogów oznaczonych jako chronione zindeksowano bez kopiowania treści. Łącznie runtime zawiera **3** fakty z dawnych katalogów, wszystkie potwierdzone instytucjonalnie.

## Czego nadal potrzebujemy

1. **PRL — legalne pary awers–rewers.** Obecne pokrycie wizualne (10 par na 704 odmian) jest za małe. Następny bezpieczny kanał to umowy z muzeami albo zdjęcia użytkowników przekazane na jasnej licencji; obrazy NC/ND i zdjęcia aukcyjne pozostają wyłączone.
2. **Średniowiecze — typologia stempli.** Legend jest więcej, ale potrzebne są kontrolowane atomy: znaki, korony, układ krzyży/punktów, wariant orła i pary awers–rewers ze Stronczyńskiego oraz innych źródeł public-domain z numerem strony/tablicy.
3. **II RP — znaki mennicze, nie samo pole mennicy.** Liczba realnych rodzin wielomenniczych: 10; rekordów bez mennicy: 2; rekordów z zapisem niejednoznacznym: 0. Każda odmiana wymaga osobnego markera wizualnego; nie wolno rozdzielać jej wyłącznie po roku.
4. **Drzewa historyczne — kontrola ekspercka danych, nie etykieta dla użytkownika.** Gałęzie zaborów, powstań, Jagiellonów i monarchii elekcyjnej wymagają checklisty kolizji nazw władców, mennic i nominałów.
5. **Potwierdzenia wieloźródłowe.** 422 emisji ma dziś co najmniej dwa źródła; priorytetem powinny być typy często mylone oraz wszystkie rekordy bez legalnej pary zdjęć, nie mechaniczne podbijanie licznika.
6. **Negatywy polskich monet.** Nowy korpus jest legalny, ale międzynarodowy. Potrzebne są licencjonowane przykłady polskich odlewów, usuwanych znaków mennicy, przerabianych dat i współczesnych replik — z oświadczeniem właściciela zdjęcia.
7. **Dawne katalogi — dalsza kontrola selektywna.** Spink 1900 został przeszukany bez redystrybucji OCR: 75 stron wymaga niezależnego dopasowania, a dwa trafienia dotyczące tego samego dukata 1831 nie są liczone jako dwa źródła. Zakresy Karolkiewicza, Hess 1906 i Schlessinger 1929 oraz trzy krawędzie do Chełmińskiego/Frankiewicza są zapisane. Chronione fotografie i opisy pozostają poza runtime.

## Zasada bezpieczeństwa

Korpus negatywny może wywołać komunikat „cechy wymagają ostrożności / konsultacji”, ale nie werdykt autentyczności. APOMONET pozostaje narzędziem wstępnej identyfikacji, a brak dowodu nie jest dowodem autentyczności ani falsyfikatu.
