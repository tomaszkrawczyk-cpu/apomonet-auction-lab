# APOMONET — status 2026-08-15

## Najważniejsze zmiany tej rundy
- Etap 1 nie nadpisuje już automatycznie władcy na podstawie samego roku. Konflikt chronologiczny obniża confidence, wstrzymuje wycenę i wymaga kontroli portretu/legendy.
- Confidence całej analizy jest ograniczony do 95%; UI pokazuje osobno pewność władcy, roku i nominału.
- Dodano kontrolę możliwego duplikatu podstawowej tożsamości w lokalnej kolekcji.
- Dodano opcjonalne dane właściciela: waga, średnica i rant; trafiają do tej samej sesji i kontekstu Etapu 2.
- Wdrożono jeden właściciel pipeline'u zdjęć: bezpieczny kadr z marginesem, powrót do całego zdjęcia przy niepewnym wykryciu, obraz podglądowy do 560 px i obraz analityczny do 900 px z limitem transportowym.
- Poprawka sesji zachowuje miniatury po powrocie z ręcznej korekty bez konieczności ponownego wybierania zdjęć.
- Komunikat transportowy na telefonie nie jest już nadpisywany ogólnym tekstem `Failed to fetch`.
- Start dostał prywatne, lokalne podsumowanie: liczba monet, albumów, suma dostępnych wycen i ostatnie pozycje.
- Kolekcja dostała filtry rzadkości i stanu obok władcy, nominału, mennicy i metalu.
- Nowe elementy mają pokrycie tłumaczeń PL/EN/DE/FR.
- Kolekcja prowadzi teraz do rzeczywistej karty zapisanej monety. Karta ponownie pokazuje oba zdjęcia, zaakceptowane dane użytkownika, opis i odsyła do dalszej edycji.
- Naprawiono błąd składni `chronology-guard.js`, który wyłączał wspólną kontrolę chronologii w przeglądarce.
- Etap 2 nie przekazuje już zapisanych zdjęć i `rawAI` drugi raz wewnątrz tekstowego kontekstu. API otrzymuje tylko dozwolone pola po korekcie.
- Etap 2 ma trzy czytelne komunikaty postępu, limit 55 s po stronie API i 62 s w UI oraz bezpieczny komunikat ponowienia bez utraty zdjęć/danych.
- Błędy infrastruktury w formie obiektu są pokazywane czytelnie zamiast jako `[object Object]`.

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

## Zweryfikowany kamień milowy — podstawa promocji
- Automatyczny przepływ E2E został zweryfikowany wcześniej na preview `dpl_6PPqxnP7ycV4HXg7qh8krkrnBe7m`; ten sam zestaw poprawek jest promowany na `main`.
- Automatyczny test w chmurowym Chrome przeszedł cały przepływ: wybór awersu i rewersu razem → lokalne przygotowanie zdjęć → `/api/analyze` → korekta użytkownika → ponowny powrót z obiema miniaturami → zapis → kolekcja → otwarcie karty monety.
- `/api/analyze` zwrócił HTTP 200; logi tej wersji nie zawierają odpowiedzi 4xx/5xx dla testowanego przepływu.
- Po ponownym otwarciu potwierdzono: oba zdjęcia obecne, skorygowany nominał i emitent widoczne, `userAccepted` pokazany jako dane użytkownika, puste sekcje opcjonalne ukryte.
- Testy regresji: 10/10 zaliczonych; kontrola składni wszystkich plików JavaScript i `git diff --check` bez błędów.

## Test fizycznego Androida i Etapu 2
- Tester potwierdził, że na pierwszej realnej monecie analiza podstawowa pomyliła monetę, władcę i rok, ale korekta była możliwa i została przyjęta.
- Na drugiej realnej monecie wynik był lepszy: jedynym zgłoszonym błędem był rok, a korekta została przyjęta.
- Dotychczasowa analiza szczegółowa odpowiedziała HTTP 200, lecz w kontrolowanym teście trwała około 64 s i na telefonie wyglądała jak zawieszona.
- Optymalizacja Etapu 2 z gotowego preview `dpl_AoKbKd2vzLqgTqRiDGt7phFrcAs1` jest przenoszona na produkcyjny `main`.
- Pełny test POST po promocji wymaga realnych zdjęć lub kontrolowanego testu telefonu; nie wyłączono ochrony preview i nie eksportowano klucza OpenAI.

## Korekta / zapis / eksport
- Ręczna korekta zachowuje `rawAI`, zdjęcia, sesję i dane zaakceptowane przez użytkownika.
- `correction-consistency.js` buduje kanoniczny tytuł z poprawionych pól, aby stare określenia AI (np. błędny nominał) nie zostawały w PDF/karcie po korekcie.
- PDF wybranych działa przez ekran drukowania; XLSX jest generowany jako prawdziwy pakiet `.xlsx` i eksportuje kontrolowany zestaw pól, bez `rawAI` i danych sesyjnych.
- Udostępnianie pozostaje wywoływane świadomie przez użytkownika; kolekcja i dashboard są lokalne.

## Co wymaga teraz fizycznego testu Androida
1. zapis poprawionej monety i ponowne otwarcie jej karty na telefonie,
2. powtórzenie przepływu na słabszej sieci i większym zestawie monet,
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
