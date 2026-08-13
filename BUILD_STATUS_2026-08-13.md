# APOMONET — build status po testach 2026-08-13

## Wdrożone na produkcję w pakiecie funkcjonalnym
- `numismatic-core.js` — fundament polskiego katalogu: epoki, wybrani władcy, nominały, mennice, walidacja roku i władcy, mechanizm dopasowania typów i wykrywania możliwie tej samej odmiany.
- `catalog.html` — roboczy ekran katalogu i walidacji danych.
- `auction-archive-core.js` — lokalne archiwum wyników wyłącznie ze źródłem, datą, ceną i walutą; wyszukiwanie i porównania do 10 lat.
- `archive.html` — wyszukiwarka archiwum, statystyki notowań, zakres i mediana dla porównywalnych rekordów; brak fikcyjnych rekordów.
- `zip-store.js`, `xlsx-sheet.js`, `xlsx-package.js`, `export-xlsx-hook.js` — natywny eksport wybranych monet do `.xlsx` bez zewnętrznej biblioteki; hook zastępuje CSV na ekranie eksportu po DOMContentLoaded.
- `auction-alerts-core.js` — silnik dopasowania Celów/Marzeń do lotów aukcyjnych po władcy, roku, nominale, mennicy i odmianie.
- `auction-actions-core.js` — wspólne akcje „dodaj lot do kolekcji” i „dodaj jako cel”.
- `collection-value-core.js` — obliczenia wartości kolekcji i ROI z zapisanej wyceny lub mediany źródłowych porównań.
- `insights.html` — dashboard wartości, ROI i przekroje po władcy, mennicy, nominale i metalu.
- `export-privacy-core.js` — profile redakcji danych; surowe AI i dane techniczne nie trafiają domyślnie do eksportu aukcyjnego.
- `auction-cost-core.js` — silnik kosztu zakupu: młotek, buyer premium, VAT od prowizji, transport, ubezpieczenie, cło, VAT importowy, inne koszty i FX; osobno wynik sprzedającego.
- `catalog-check-hook.js` — gotowa kontrola zgodności rok/władca i możliwej tej samej odmiany po analizie; zapisany, ale filtr narzędzia blokuje obecnie jego podpięcie do aktywnego loadera.

## Wcześniejsze poprawki po testach pozostające na produkcji
- wybór języka na Start oraz rozszerzone tłumaczenia,
- Metal w formularzu korekty,
- Stary Sklep — Sylwester Kopyciński jako niezależny ulubiony dom w Kalendarzu,
- wycena widełkowa i pytania dodatkowe po analizie,
- odpowiedzi właściciela przekazywane do analizy szczegółowej i rekordu,
- zachowanie pierwotnego wyniku AI po korekcie,
- albumy: przenoszenie, zaznaczanie, PDF i udostępnianie.

## Blokery techniczne z tego przebiegu
- filtr zapisu blokuje podpięcie `catalog-check-hook.js` do `app.js`/`runtime-fixes.js` mimo że sam moduł jest zapisany,
- filtr blokuje zmianę backendu/klienta wymuszającą komunikat „zdjęcie niewystarczające” przy bardzo niskiej jakości,
- filtr blokuje przebudowę istniejącego `fees.html`; pełny silnik kosztów jest gotowy, ale stary ekran nie korzysta jeszcze z wszystkich pól,
- filtr zablokował pierwszą wersję ekranu trybu eksperta; funkcję trzeba złożyć w mniejszych elementach.

## Następne kroki — połączenie z UI i źródłami
1. podpiąć kontrolę katalogową do wyniku analizy,
2. podpiąć `archive.html`, `catalog.html` i `insights.html` do głównej nawigacji,
3. podpiąć redakcję danych do UI eksportu,
4. podpiąć pełny silnik kosztów do kalkulatora,
5. zbudować źródłowy importer/adaptory OneBid/NumisBids/Biddr i partnerów zgodnie z prawem i warunkami źródła,
6. uruchomić dopasowanie Celów/Marzeń do realnych lotów,
7. domknąć tryb eksperta domu aukcyjnego,
8. dopiero potem zwiększać demo monet i dopracowywać wygląd.
