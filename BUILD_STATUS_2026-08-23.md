# APOMONET — status stabilizacji 2026-08-23

## Punkt wejścia

- Gałąź: `main`
- Commit bazowy: `9a92268`
- Produkcja przed tym etapem: zawartość odpowiadała commitowi `0bafab1`
- Regresja wejściowa: 457 testów, 408 zaliczonych, 49 błędów

## Wykonane prace

1. Uporządkowano kontrakty krytycznego przebiegu: zdjęcia awersu i rewersu, korekta zaakceptowanej identyfikacji, zapis do albumu, trwałe zdjęcia i otwieranie dokładnie tego rekordu, który został zapisany.
2. Zachowano ochronę przed spóźnioną odpowiedzią tłumaczenia po zmianie języka.
3. Potwierdzono, że opis Stage 2 jest uzgadniany z zaakceptowaną identyfikacją użytkownika i nie przywraca starej identyfikacji AI.
4. Ujednolicono testy ze współczesną architekturą kanoniczną. Nie przywracano usuniętych duplikatów:
   - `auction-fx-date-core.js` zastępuje aktywny `auction-fx-date-policy.js`,
   - `coin-stage2-summary-fix.js` zastępują `coin-card-canonical-fields.js` oraz `coin-card-finish.js`.
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

## Ograniczenie środowiska

Automatyczna przeglądarka nie została uruchomiona, ponieważ środowisko nie udostępniało programu `agent-browser`, a pobranie lokalnego Chromium zostało zablokowane przez dostępną sieć. Nie wpływa to na wynik regresji, ale fizyczny test responsywności i aparatu na telefonie nadal pozostaje końcową bramką testera.

## Następna bramka

1. Commit i push do `main`.
2. Oczekiwanie na wdrożenie Vercel i kontrola `/api/health` oraz zawartości produkcji.
3. Krótki test fizyczny na Androidzie: dwa zdjęcia → Stage 1 → korekta → Stage 2 → zapis do albumu → otwarcie właściwej karty.

