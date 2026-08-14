# APOMONET — Market Fact Import status 2026-08-14

## WCN — wdrożone
- kontrolowany adapter wyłącznie dla bezpośrednich URL `https://wcn.pl/archive/{numeric_id}`,
- brak odkrywania linków, brak list/paginacji i brak crawlera,
- batch maksymalnie 8 URL podanych jawnie przez użytkownika,
- żądania wykonywane sekwencyjnie z przerwą 250 ms,
- zapis wyłącznie znormalizowanych faktów: source/sourceId/sourceUrl, data sprzedaży, cena zrealizowana, waluta, stan i typ ceny,
- opisy, fotografie i układ strony są odrzucane,
- cena WCN `Sell price` jest zapisywana jako `realizedPrice`, nie jako `hammerPrice`,
- identyfikacja monety (władca, nominał, rok, mennica, odmiana, metal) pochodzi z zaakceptowanego rekordu APOMONET, z którym użytkownik jawnie wiąże wynik,
- deduplikacja po stabilnym ID WCN; ponowne dodanie aktualizuje rekord zamiast dublować,
- preview-before-save: fakty są najpierw pokazane użytkownikowi, dopiero później zapisywane,
- po zapisie UI pokazuje jakość materiału do wyceny (limited / usable / strong),
- batch UI ma komunikaty PL/EN/DE/FR.

## Test produkcji
- `/api/market-fact?health=1` => HTTP 200, adapter `WCN_DIRECT_RECORDS`, maxBatch=8, delayMs=250, storesDescriptions=false, storesImages=false,
- karta WCN 344688 została poprawnie odczytana jako 1950 PLN, data 2022-06-09, stan I,
- karta WCN 441270 została poprawnie odczytana jako 4000 PLN, data 2026-06-04, stan I,
- po korekcie typu ceny karta 344688 zwraca realizedPrice=1950 i hammerPrice=null.

## Granice
Ten adapter służy do budowania własnych obserwacji rynku, a nie kopii archiwum WCN. Nie wolno rozszerzać go o automatyczne odkrywanie pozycji, paginację, masowe pobieranie opisów/zdjęć ani obchodzenie ograniczeń technicznych bez osobnej decyzji i przeglądu źródła.

## Następne kroki
1. fizyczny test batch UI na Androidzie,
2. import kilku wyników tej samej monety i sprawdzenie mediany/percentyli,
3. osobny adapter tylko dla źródła, które przejdzie przegląd zasad lub da zgodę,
4. po zgodzie Starego Sklepu preferować bezpośredni eksport właściciela zamiast pobierania przez OneBid.
