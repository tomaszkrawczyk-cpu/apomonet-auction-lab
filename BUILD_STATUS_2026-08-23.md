# APOMONET — status stabilizacji 2026-08-23

## Punkt wejścia

- Gałąź: `main`
- Commit bazowy: `9a92268`
- Commit stabilizacyjny na GitHubie: `1295570`
- Produkcja przed tym etapem: zawartość odpowiadała commitowi `0bafab1`
- Produkcja po tym etapie: zawartość odpowiada commitowi `1295570`
- Regresja wejściowa: 457 testów, 408 zaliczonych, 49 błędów

## Wykonane prace

1. Uporządkowano kontrakty krytycznego przebiegu: zdjęcia awersu i rewersu, korekta zaakceptowanej identyfikacji, zapis do albumu, trwałe zdjęcia i otwieranie dokładnie tego rekordu, który został zapisany.
2. Zachowano ochronę przed spóźnioną odpowiedzią tłumaczenia po zmianie języka.
3. Potwierdzono, że opis Stage 2 jest uzgadniany z zaakceptowaną identyfikacją użytkownika i nie przywraca starej identyfikacji AI.
4. Ujednolicono testy ze współczesną architekturą kanoniczną. Nie przywracano usuniętych duplikatów:
   - aktywny `auction-fx-date-policy.js` zastępuje dawny `auction-fx-date-core.js`,
   - `coin-card-canonical-fields.js` oraz `coin-card-finish.js` zastępują dawny `coin-stage2-summary-fix.js`.
5. Naprawiono realną niespójność kontekstu siły nabywczej:
   - aktywny moduł `auction-purchasing-power-context.js` jest ładowany przed kartami aukcyjnymi,
   - UI używa właściwego API `ApoAuctionPurchasingPower`,
   - wymagane są współczynnik, źródło i data odniesienia,
   - wynik pozostaje wyłącznie kontekstem i nie wpływa na wycenę monety.
6. Potwierdzono konserwatywne progi wyceny: co najmniej trzy rekordy o jednej podstawie ceny, preferencja ścisłych dopasowań, kontrola stanu zachowania, jakości źródła, FX i cen odstających.
7. Zastąpiono kruche kontrole tekstu testami zachowania tam, gdzie było to możliwe, m.in. dla wielojęzycznych wartości „Nie ustalono”, walut kolekcji, eksportu i siły nabywczej.

## Weryfikacja lokalna

- Pełna regresja: **463/463 zaliczone**
- Pominięte testy: **0**
- Kontrola składni wszystkich plików `.js` i `.mjs`: zaliczona
- `git diff --check`: zaliczony
- Główne strony statyczne: HTTP 200 dla strony głównej, analizy, kolekcji, albumów, karty monety, eksportu, kalendarza, archiwum i zdrowia aplikacji
- Referencje skryptów aktywnego runtime: 118, brak brakujących plików

## Weryfikacja wdrożenia

- Vercel dla commitu `1295570`: **success**
- Produkcyjny `/api/health`: `ok=true`
- Analiza OpenAI: aktywna
- Smithsonian: aktywny i poprawnie zweryfikowany
- Europeana: skonfigurowana, lecz kontrola klucza zwraca `europeanaValid=false`; funkcja pozostaje bezpiecznie wyłączona
- Siedem zmienionych modułów runtime po odświeżeniu cache: sumy kontrolne zgodne z kodem przetestowanym lokalnie
- Główne trasy produkcyjne: HTTP 200

## Ograniczenie środowiska

Automatyczna przeglądarka nie została uruchomiona, ponieważ środowisko nie udostępniało programu `agent-browser`, a pobranie lokalnego Chromium zostało zablokowane przez dostępną sieć. Nie wpływa to na wynik regresji, ale fizyczny test responsywności i aparatu na telefonie nadal pozostaje końcową bramką testera.

## Następna bramka

Commit, push, wdrożenie i techniczna kontrola produkcji zostały wykonane. Pozostała wyłącznie fizyczna bramka na telefonie:

1. Dwa zdjęcia → Stage 1 → korekta → Stage 2 → zapis do albumu → otwarcie właściwej karty.
2. Ponowne zdjęcie i usuwanie tła bez utraty analizy.
3. Zmiana PL → EN → DE → FR → PL bez utraty karty, zdjęć i korekt.
4. PDF, XLSX i systemowe udostępnianie na urządzeniu mobilnym.
5. Wygaszenie ekranu podczas Stage 1 i Stage 2 oraz bezpieczny powrót do wyniku.
