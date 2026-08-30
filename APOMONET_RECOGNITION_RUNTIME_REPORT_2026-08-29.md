# APOMONET — raport uruchomienia materiału w rozpoznawaniu (2026-08-29)

## Wynik

Materiał nie jest już wyłącznie zbiorem rekordów. Runtime pracuje na trwałej hierarchii **okres → emitent/władca → coinTypeId → emisja rok/mennica → odmiana → egzemplarz**, a szybkie sita i kontrolowane rodziny pomyłek zawężają kandydatów przed droższą analizą. Pełny lokalny benchmark osiąga **100% Top-1 typu, 100% Top-3 i 100% poprawnego zatrzymania**, przy **0% odpowiedzi podanych z nadmierną pewnością** w zestawie abstencyjnym.

To jest wynik na zamrożonym zestawie 30 przypadków, nie obietnica 100% na dowolnym zdjęciu użytkownika. Ostateczna kontrola zdjęć z telefonu pozostaje konieczna.

## Co rzeczywiście podłączono do rozpoznawania

- **22 149 egzemplarzy źródłowych** jest przypisanych do **2785 typów nadrzędnych**, **5926 emisji** i **6291 odmian**. Alias źródła nie tworzy nowego typu.
- Rozdzielono mylnie scalane projekty monet próbnych PRL, m.in. 10 zł 1964 „drzewko” i „kobieta”. Główny projekt jest częścią typu, nie tylko odmianą materiałową.
- Sita nadają pierwszeństwo nominałowi, metalowi, masie, średnicy, rokowi, mennicy, atomom legendy i znakom. Niepewny odczyt nie staje się twardym filtrem.
- Kontrolowane rodziny pomyłek obejmują PRL, II RP, Gdańsk/Toruń/Elbląg/Rygę, ciężkie złoto, denary/brakteaty i obiekty negatywne.
- Medale, żetony, repliki/kopie i odlewy nie mogą wejść do pozytywnego werdyktu. Korpus negatywny pozostaje osobny: **89 legalnych obrazów**, w tym **15 grup z parą stron**.
- Interfejs rozróżnia „Typ ustalony”, „Odmiana potwierdzona”, wynik częściowy, kilku kandydatów i „nie udało się ustalić”. Odmiana jest potwierdzana tylko przy widocznej cesze rozstrzygającej.
- Dwuetapowa analiza pozostała zachowana: Stage 1 daje krótki typ i dane podstawowe, Stage 2 rozwija odmianę, legendy, znaki, ostrzeżenia i literaturę.
- Spink 1900: przeszukano **707 stron**, wskazano **79 stron**, a **75** pozostawiono poza runtime. Dwa notowania dukata warszawskiego 1831 utworzyły **jedno** świadectwo źródłowe i zostały podpięte do istniejącego typu dopiero po zgodności z MNK i MNW. Nie zaimportowano OCR ani fotografii.

## Benchmark przed i po

| Metryka | Przed | Po | Zmiana |
|---|---:|---:|---:|
| Trafność Top-1 typu | 79.2% | 100% | +20.8 p.p. |
| Prawidłowy typ w Top-3 | 83.3% | 100% | +16.7 p.p. |
| Poprawna rodzina diagnostyczna | 83.3% | 100% | +16.7 p.p. |
| Poprawne „nie wiem” | 66.7% | 100% | +33.3 p.p. |
| Nadmiernie pewna błędna odpowiedź | 33.3% | 0% | -33.3 p.p. |
| Lokalny czas p50 | 13.298 ms | 14.350 ms | 7.9% |
| Lokalny czas p90 | 21.013 ms | 19.344 ms | -7.9% |
| Kandydaci przekazani dalej — suma | 2921 | 363 | -87.6% |
| Kandydaci na przypadek — średnia | 97.37 | 12.1 | -87.6% |
| Kandydaci na przypadek — mediana | 9 | 3 | -66.7% |

W pierwszej próbie twardych sit wystąpiła regresja Top-1 do 62,5%. Benchmark ją wykrył; poprawiono interpretację metalu (napis „ZŁOTE” nie oznacza złota) i niepewnego nominału, po czym wynik wzrósł do 91,7%, a następnie do 100%. Pośrednie pomiary zostały zachowane w katalogu wyników benchmarku.

### Koszt AI

Lokalny benchmark celowo nie wywołuje płatnego modelu: rzeczywisty koszt tokenów wynosi w nim **0**, ale nie jest to pomiar kosztu produkcyjnego. Nie podajemy fikcyjnej kwoty. Mierzalny wskaźnik kosztowy — liczba kandydatów przekazywanych dalej — spadł z **2921 do 363 (-87.6%)**. Dopiero kontrolowana próba Stage 1 na środowisku z rozliczanym API pozwoli podać koszt w złotych/dolarach.

## Kolejka badawcza

Jednostek nie sumujemy, bo częściowo się pokrywają:

| Kolejka | Liczba | Status |
|---|---:|---|
| Strony Spinka 1900 wymagające drugiego źródła | 75 | bez wpływu na runtime |
| Nazwane tropy z dawnych katalogów | 3 | bez wpływu na runtime |
| Pozycje polskie z katalogów chronionych | 1578 | tylko indeks lotów |
| Typy hierarchii oznaczone do kontroli | 287 | aktywne dane, bez automatycznego scalenia |
| Pozycje/range w indeksie kolekcji historycznych | 6948 | indeks proweniencji; zakres nakłada się na część powyższych danych |

## Pokrycie zdjęciami

- Cały katalog: **14 149 / 22 149** egzemplarzy ma co najmniej jeden obraz; **6246** ma co najmniej dwa obrazy.
- PRL: **37/715** egzemplarzy ma obraz, tylko **10** ma parę awers–rewers. To nadal najpoważniejsza luka wizualna.
- II RP i wojna: **174/272** ma obraz, **171** parę.
- Dawne katalogi w tej partii: **0 zdjęć** — świadomie, ze względu na prawa i brak item-level zgody.

## Ryzyka prawne i jakościowe

1. Domena publiczna tekstu/monety nie przesądza o prawach do współczesnego skanu lub fotografii. Dla Spinka zapisano tylko fakty, strony, tokeny i skróty stron.
2. Historyczny katalog jest źródłem klasy C. Samo znalezienie pozycji nie wystarcza do utworzenia typu.
3. Korpus negatywny pomaga wywołać ostrożność, ale APOMONET nie orzeka autentyczności i nie nazywa obiektu falsyfikatem wyłącznie na podstawie zdjęcia.
4. Wynik 100% dotyczy stałego benchmarku 30 przypadków. Potrzebny jest większy, niezależny zestaw realnych zdjęć telefonicznych, którego nie używano podczas strojenia.
5. Średniowieczne legendy i znaki nadal nie tworzą kompletnej typologii stempli. Przy słabym zdjęciu system powinien częściej zatrzymać się na rodzinie.

## Najważniejsze pozostałe luki

1. Legalne pary awers–rewers PRL, zwłaszcza roczniki/metale/wzory/znaki najczęściej mylone.
2. Niezależny „ślepy” benchmark ze zdjęć telefonicznych, obejmujący zużycie, odblaski, kąt i niepełny kadr.
3. Typologia denarów i brakteatów: kontrolowane atomy legend, koron, krzyży, punktów, orłów i par stempli.
4. Polskie, licencjonowane przykłady replik, odlewów, przerobionych dat i usuwanych znaków mennicy.
5. Ręczna kontrola 10 realnych rodzin wielomenniczych II RP oraz 2 rekordów bez mennicy.
6. Gałęziowa kontrola zaborów/powstań, Jagiellonów i monarchii elekcyjnej bez masowego scalania.
7. Pomiar kosztu Stage 1 na środowisku z rzeczywistym rozliczeniem API; bez zmiany na słabszy model przed testem jakości.

## Co przetestować na telefonie

1. **Łatwa moneta:** zrób poprawne zdjęcia obu stron zwykłej monety III RP; sprawdź krótki Stage 1 i czas od wysłania do wyniku.
2. **PRL 10 zł 1964:** osobno „drzewko” i „kobieta”; wynik nie może ich scalić. Przy zasłoniętej cesze projektu ma pokazać kandydatów albo poprosić o lepsze zdjęcie.
3. **II RP:** moneta z czytelnym i nieczytelnym znakiem mennicy; bez znaku nie wolno potwierdzić odmiany.
4. **Ciężkie złoto:** dukat oraz wielokrotność z podaną masą i bez masy; bez metrologii system ma zatrzymać się na rodzinie, jeśli wielokrotność jest niepewna.
5. **Średniowiecze:** zużyty denar/brakteat, jedna strona i zdjęcie pod kątem; oczekiwany jest wynik częściowy lub „nie udało się ustalić”, nie wymyślona odmiana.
6. **Obiekt negatywny:** medal, żeton i wyraźnie opisana replika/kopia; żaden nie może dostać pozytywnego typu monety ani werdyktu autentyczności.
7. **Korekta użytkownika:** popraw błędny rok/mennicę, zamknij analizę i otwórz ponownie; korekta ma pozostać i nie może zostać nadpisana przez AI.
8. **Albumy i zdjęcia:** utwórz kilka albumów, dodaj wiele pozycji, uruchom aplikację ponownie i sprawdź kompletność lokalnych zdjęć.
9. **Języki:** przełącz kolejno PL/EN/DE/FR na wyniku pewnym, częściowym i nierozpoznanym; nie może być mieszania języków ani angielskich fallbacków w środku polskiego ekranu.
10. **Eksport:** wyeksportuj zaznaczone monety i cały album do PDF, prawdziwego XLSX oraz pozostałych dostępnych formatów; otwórz pliki w zewnętrznej aplikacji i sprawdź zdjęcia, polskie znaki oraz kolumny.
11. **Stage 2:** rozwiń analizę szczegółową; sprawdź, czy odmiana, legendy i ostrzeżenia są oddzielone od szybkiego wyniku i czy nie pojawia się etykieta „zweryfikowane przez eksperta”.
12. **Pomiar:** zanotuj model telefonu, system, sieć, czas Stage 1 i Stage 2 dla pięciu monet oraz przypadki, w których system powinien powiedzieć „nie wiem”, a tego nie zrobił.
