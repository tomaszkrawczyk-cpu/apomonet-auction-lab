# APOMONET — kontrola spójności przed pierwszym testerem — 2026-08-16

## Stan produkcji
- Stały adres: https://apomonet-auction-lab.vercel.app/
- Produkcyjny deployment po aktualizacji: READY.
- `/api/health`: HTTP 200; analiza OpenAI aktywna; Smithsonian aktywny i poprawny; Europeana pozostaje wyłączona funkcjonalnie z powodu nieważnego klucza.
- W ostatniej kontroli logów produkcyjnych nie było grup błędów 4xx/5xx dla podstawowego przepływu. Pozostaje ostrzeżenie deprecacji `url.parse()` raportowane przez ścieżki adapterów źródeł zewnętrznych; wyszukiwanie repozytorium nie wykazało bezpośredniego użycia `url.parse()` w kodzie aplikacji, więc nie wykonano ryzykownej zmiany bez potwierdzonego źródła warningu.

## Zweryfikowane problemy zgłoszone podczas testów
1. Niepewne wycinanie tła na wzorzystym tle — aplikacja zachowuje oryginał i prosi o lepsze zdjęcie zamiast ryzykować złe wycięcie.
2. Brak możliwości ponownego zrobienia zdjęcia po nieudanym usuwaniu tła — dodano przyciski ponownego wykonania awersu/rewersu bez utraty wyniku analizy.
3. Zdjęcia zapisywane do niewłaściwej monety / otwieranie innego rekordu — przygotowanie zdjęcia jest wiązane z `coinId` aktualnie zapisywanej monety, a po zapisie rekord jest ponownie weryfikowany.
4. Brak zdjęć po ponownym otwarciu zapisanej monety — karta, kolekcja i album korzystają ze wspólnego resolvera zdjęć i preferują przygotowany PNG w trybie `cut`.
5. Korekta danych nie aktualizowała opisu — zaakceptowane korekty usuwają stare sprzeczne informacje z opisu; przypadek Wilno → Nagybánya jest zabezpieczony testem.
6. Zmiana języka chowała kartę / nie tłumaczyła treści — karta pozostaje widoczna podczas tłumaczenia, a bezpieczne pola treści są tłumaczone PL/EN/DE/FR bez wysyłania zdjęć i prywatnych notatek.
7. Brak czytelnej drogi po zapisie — po zapisie dostępne są bezpośrednie akcje: karta monety, kolekcja i albumy.
8. Rzadkość Kopickiego — osobny blok katalogowy pokazuje wyłącznie konkretną referencję/stopień zwrócony przez analizę szczegółową i wyraźnie wymaga potwierdzenia katalogiem lub przez eksperta przed profesjonalnym użyciem.
9. Notowania aukcyjne — dodano osobny blok niezależny od rzadkości Kopickiego. Licznik obejmuje wyłącznie zweryfikowane, porównywalne fakty aukcyjne z ostatnich 10 lat zapisane w archiwum APOMONET. Brak danych daje uczciwe `0`/komunikat o braku danych; nie są generowane sztuczne liczby. Zakres cen jest pokazywany tylko przy wystarczającej jakości próbki.

## Automatyczne zabezpieczenie regresji
- `tests/album-retake-regression.test.mjs` obejmuje ponowne zdjęcie bez utraty analizy i przypisanie obu zdjęć do właściwego rekordu.
- `tests/analysis-record-flow-fix.test.mjs` zabezpiecza świeży rekord, właściwe ID i nawigację po zapisie.
- `tests/coin-card-finish.test.mjs` zabezpiecza kartę zapisanej monety, zdjęcia i analizę szczegółową.
- `tests/core-flow.test.mjs` obejmuje główny przepływ, tłumaczenia, korekty, zdjęcia, eksport i zabezpieczenia danych.
- `tests/market-rarity-regression.test.mjs` zabezpiecza rozdzielenie Kopickiego od notowań oraz liczenie wyłącznie prawidłowych porównywalnych faktów z ostatnich 10 lat.
- GitHub Actions `.github/workflows/regression.yml` uruchamia `node --test tests/*.test.mjs` przy każdym pushu do `main` i każdym PR.
- Run #29 po wdrożeniu zmian zakończył się `success` — pełny pakiet regresji jest zielony.

## Weryfikacja produkcyjna po zmianach
- Stabilny adres produkcyjny zwraca `/api/health` HTTP 200.
- Produkcyjny plik `analysis-numismatic-market.js` zawiera wdrożony blok `Notowania aukcyjne`, okres 10 lat, jawne komunikaty o braku/ograniczonej próbce oraz zapis `auctionRecordCount10y` i `verifiedOnly`.
- Deployment powiązany z funkcją notowań ma stan `READY` i target `production`.

## Ograniczenie bieżącej kontroli
W File Library dostępne są zrzuty ekranowe z wcześniejszych prób, ale nie ma oryginalnych par plików awers/rewers użytych w tych analizach. Nie można więc uczciwie odtworzyć dokładnie tych samych dawnych wejść przez `/api/analyze`. Scenariusze błędów z tych prób są jednak pokryte testami regresji. Najlepszym końcowym smoke-testem są teraz świeże pary zdjęć z galerii na fizycznym Androidzie.

## Bramka przed wysłaniem pierwszemu testerowi
- 3–5 świeżych monet z galerii: analiza podstawowa, zapis, ponowne otwarcie karty.
- Co najmniej jedna ręczna korekta i kontrola, czy opis oraz karta pokazują poprawione dane.
- Jedna próba „Usuń tło” na dobrym tle oraz jedna na trudnym tle z ponownym zdjęciem bez utraty analizy.
- Jedna zmiana języka na zapisanej karcie PL → EN → DE → PL.
- Jedna analiza szczegółowa i kontrola pola Kopicki.
- Kontrola pola `Notowania aukcyjne`: liczba ma wynikać wyłącznie z realnie zaimportowanych faktów; brak danych ma pozostać brakiem danych.
- Po tych próbach kontrola logów produkcyjnych; jeśli brak nowych błędów 4xx/5xx i zdjęcia pozostają przy właściwych rekordach, wersję można przekazać pierwszemu zaufanemu testerowi.

## Nieblokujące kwestie zewnętrzne / dalsza rozbudowa
- Europeana: potrzebny poprawny Personal API Key.
- Pełne pokrycie notowań z ostatniej dekady wymaga dalszego legalnego importu/adapterów do źródeł aukcyjnych; obecny licznik jest poprawny dla danych już zweryfikowanych w APOMONET, ale nie udaje kompletnego indeksu całego rynku.
- Kopicki: obecny wynik jest kandydatem z analizy szczegółowej, nie pełną licencjonowaną bazą katalogową. Docelowe automatyczne potwierdzenie wymaga wiarygodnej bazy/referencji katalogowej lub zatwierdzenia eksperckiego.
- Przed szerokim publicznym udostępnieniem nadal potrzebne są docelowe rate limiting/auth dla kosztowych endpointów AI.
