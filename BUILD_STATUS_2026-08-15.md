# APOMONET — status 2026-08-15

## Najważniejsze zmiany tej rundy
- Etap 1 nie nadpisuje już automatycznie władcy na podstawie samego roku. Konflikt chronologiczny obniża confidence, wstrzymuje wycenę i wymaga kontroli portretu/legendy.
- Confidence całej analizy jest ograniczony do 95%; UI pokazuje osobno pewność władcy, roku i nominału.
- Dodano kontrolę możliwego duplikatu podstawowej tożsamości w lokalnej kolekcji.
- Dodano opcjonalne dane właściciela: waga, średnica i rant; trafiają do tej samej sesji i kontekstu Etapu 2.
- Przywrócono właściwy lekki pipeline zdjęcia: kadr monety 640x640 zamiast późniejszego hotfixu wysyłającego całe zdjęcie 1200 px. Zmniejsza payload i usuwa zbędne tło z wejścia AI.
- Poprawka sesji zachowuje miniatury po powrocie z ręcznej korekty bez konieczności ponownego wybierania zdjęć.
- Komunikat transportowy na telefonie nie jest już nadpisywany ogólnym tekstem `Failed to fetch`.
- Start dostał prywatne, lokalne podsumowanie: liczba monet, albumów, suma dostępnych wycen i ostatnie pozycje.
- Kolekcja dostała filtry rzadkości i stanu obok władcy, nominału, mennicy i metalu.
- Nowe elementy mają pokrycie tłumaczeń PL/EN/DE/FR.

## Źródła i diagnostyka
- Smithsonian: skonfigurowany i zweryfikowany na produkcji; health => valid=true.
- American Numismatic Society: health 200; jeden endpoint obsługuje single record, metadata search i reference support.
- Europeana: zmienna środowiskowa jest wpisana, ale obecny klucz jest odrzucany przez Europeana (`401`, `API key is invalid`). Adapter pozostaje wyłączony funkcjonalnie do czasu poprawnego Personal API Key.
- `/api/health` rozróżnia teraz `configured` od `valid`; nie udaje, że samo istnienie sekretu oznacza działającą integrację.

## Produkcja / transport
- Dwa ostatnie realne testy telefonu dotarły do `/api/analyze` i zakończyły się po stronie Vercela HTTP 200. Oznacza to, że backend/OpenAI wykonały analizę, a ostatni `Failed to fetch` był problemem transportu odpowiedzi do telefonu, nie błędem rozpoznania ani brakiem OPENAI_API_KEY.
- Pipeline obrazów został odchudzony po wykryciu regresji 1200 px.
- Backend odrzuca nadmiernie duże obrazy kontrolowanym HTTP 413 zamiast przeciążać analizę.
- Ostatni kontrolowany health: OpenAI configured=true, Smithsonian configured/valid=true, Europeana configured=true/valid=false.

## Korekta / zapis / eksport
- Ręczna korekta zachowuje `rawAI`, zdjęcia, sesję i dane zaakceptowane przez użytkownika.
- `correction-consistency.js` buduje kanoniczny tytuł z poprawionych pól, aby stare określenia AI (np. błędny nominał) nie zostawały w PDF/karcie po korekcie.
- PDF wybranych działa przez ekran drukowania; XLSX jest generowany jako prawdziwy pakiet `.xlsx` i eksportuje kontrolowany zestaw pól, bez `rawAI` i danych sesyjnych.
- Udostępnianie pozostaje wywoływane świadomie przez użytkownika; kolekcja i dashboard są lokalne.

## Co wymaga teraz fizycznego testu Androida
1. ponowny test dwóch zdjęć po przywróceniu lekkiego kadru 640x640 — czy znika `Failed to fetch`,
2. analiza → korekta → powrót: zdjęcia, poprawione dane i opis,
3. Etap 2 po podaniu wagi/średnicy/rantu,
4. zapis do albumu i miniatury,
5. PDF oraz XLSX na Androidzie,
6. share przez WhatsApp/Messenger/e-mail,
7. zmiana języka po dodaniu nowych elementów UI,
8. backup/restore i `.ics`.

## Blokery zewnętrzne
- Europeana: potrzebny działający Personal API Key; oba ciągi z dotychczasowych notatek zostały ręcznie sprawdzone i są odrzucane jako invalid.
- Stary Sklep: pełniejsze użycie materiału eksperckiego wymaga zgody właściciela w uzgodnionym zakresie.
- Benchmark trafności wymaga zestawu realnych monet z pewną identyfikacją/odmianą.
- Mocniejsza ochrona kosztowych endpointów AI przed publicznym nadużyciem wymaga docelowego mechanizmu rate limiting/auth (Vercel Firewall/WAF lub warstwa kont/tester access) przed szerokim publicznym udostępnieniem.
