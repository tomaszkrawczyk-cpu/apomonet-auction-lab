# APOMONET — kontrola spójności przed pierwszym testerem — 2026-08-16

## Stan produkcji
- Stały adres: https://apomonet-auction-lab.vercel.app/
- Produkcyjny deployment po aktualizacji testów: READY.
- `/api/health`: HTTP 200; analiza OpenAI aktywna; Smithsonian aktywny i poprawny; Europeana pozostaje wyłączona funkcjonalnie z powodu nieważnego klucza.
- W ostatniej kontroli logów produkcyjnych nie było grup błędów 4xx/5xx dla podstawowego przepływu. Pozostaje ostrzeżenie deprecacji `url.parse()` w adapterach źródeł zewnętrznych, bez wpływu na podstawową analizę monety.

## Zweryfikowane problemy zgłoszone podczas testów
1. Niepewne wycinanie tła na wzorzystym tle — aplikacja zachowuje oryginał i prosi o lepsze zdjęcie zamiast ryzykować złe wycięcie.
2. Brak możliwości ponownego zrobienia zdjęcia po nieudanym usuwaniu tła — dodano przyciski ponownego wykonania awersu/rewersu bez utraty wyniku analizy.
3. Zdjęcia zapisywane do niewłaściwej monety / otwieranie innego rekordu — przygotowanie zdjęcia jest wiązane z `coinId` aktualnie zapisywanej monety, a po zapisie rekord jest ponownie weryfikowany.
4. Brak zdjęć po ponownym otwarciu zapisanej monety — karta, kolekcja i album korzystają ze wspólnego resolvera zdjęć i preferują przygotowany PNG w trybie `cut`.
5. Korekta danych nie aktualizowała opisu — zaakceptowane korekty usuwają stare sprzeczne informacje z opisu; przypadek Wilno → Nagybánya jest zabezpieczony testem.
6. Zmiana języka chowała kartę / nie tłumaczyła treści — karta pozostaje widoczna podczas tłumaczenia, a bezpieczne pola treści są tłumaczone PL/EN/DE/FR bez wysyłania zdjęć i prywatnych notatek.
7. Brak czytelnej drogi po zapisie — po zapisie dostępne są bezpośrednie akcje: karta monety, kolekcja i albumy.

## Automatyczne zabezpieczenie regresji
- Dodano `tests/album-retake-regression.test.mjs`, obejmujący ponowne zdjęcie bez utraty analizy i przypisanie obu zdjęć do właściwego rekordu.
- Dodano GitHub Actions `.github/workflows/regression.yml` uruchamiający `node --test tests/*.test.mjs` przy każdym pushu do `main` i każdym PR.
- Pierwsze uruchomienie workflow zakończyło się `success`.

## Ograniczenie bieżącej kontroli
W File Library dostępne są zrzuty ekranowe z wcześniejszych prób, ale nie ma oryginalnych par plików awers/rewers użytych w tych analizach. Nie można więc uczciwie odtworzyć dokładnie tych samych dawnych wejść przez `/api/analyze`. Scenariusze błędów z tych prób są jednak pokryte testami regresji. Najlepszym końcowym smoke-testem są teraz świeże pary zdjęć z galerii na fizycznym Androidzie.

## Bramka przed wysłaniem pierwszemu testerowi
- 3–5 świeżych monet z galerii: analiza podstawowa, zapis, ponowne otwarcie karty.
- Co najmniej jedna ręczna korekta i kontrola, czy opis oraz karta pokazują poprawione dane.
- Jedna próba „Usuń tło” na dobrym tle oraz jedna na trudnym tle z ponownym zdjęciem bez utraty analizy.
- Jedna zmiana języka na zapisanej karcie.
- Jedna analiza szczegółowa.
- Po tych próbach kontrola logów produkcyjnych; jeśli brak nowych błędów 4xx/5xx i zdjęcia pozostają przy właściwych rekordach, wersję można przekazać pierwszemu zaufanemu testerowi.

## Nieblokujące kwestie zewnętrzne
- Europeana: potrzebny poprawny Personal API Key.
- Przed szerokim publicznym udostępnieniem nadal potrzebne są docelowe rate limiting/auth dla kosztowych endpointów AI.
