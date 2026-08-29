# APOMONET — backlog po teście Androida 2026-08-29

Status: **zapisane do poprawy, bez implementacji**.

Źródło obserwacji: zrzuty `39757.jpg`, `39759.jpg`, `39761.jpg`, `39763.jpg`, `39765.jpg`, `39767.jpg`, `39769.jpg` przekazane przez testera 2026-08-29.

## P0 — Etap 2 przywraca błędną tożsamość i łamie chronologię

Zrzuty: `39759.jpg`, `39761.jpg`, `39763.jpg`, `39765.jpg`.

- Dla dukata gdańskiego z 1551 roku wynik końcowy pokazuje `Stefan Batory`.
- Jest to sprzeczność twarda: rok 1551 nie mieści się w okresie panowania Stefana Batorego.
- Jednocześnie system zachowuje poprawne pola `1551`, `Gdańsk`, `złoto`, ale generuje opis typu odnoszący się do portretu Stefana Batorego.
- Wniosek: Etap 2 lub scalanie wyniku po Etapie 2 nadpisuje poprawniejszą identyfikację z Etapu 1. Chronology guard nie działa na końcowym rekordzie albo jest wykonywany przed ostatnim nadpisaniem pól.
- Wynik ma `Pewność AI 74%`, mimo twardej sprzeczności i komunikatu o braku bezpośrednio pasującego zewnętrznego zestawu danych. Taka kombinacja powinna wymusić blokadę wyniku lub pewność bliską zeru, a nie opis stanowczy.
- Zapis monety utrwala niemożliwą kartę `Dukat • Stephan Báthory • Danzig • 1551`.

Oczekiwane zachowanie:

1. Etap 2 nie może nadpisać potwierdzonego kandydata Etapu 1 bez mocniejszego, jawnego dowodu.
2. Kontrola chronologii ma być uruchamiana po każdym scaleniu oraz bezpośrednio przed prezentacją i zapisem.
3. Kombinacja władca–rok niemożliwa historycznie ma blokować `confirmed-candidate` i zapis bez ostrzeżenia.
4. Pewność końcowa musi uwzględniać twarde sprzeczności, brak źródła i różnicę między Etapem 1 a Etapem 2.
5. Opis odmiany/typu nie może być generowany z odrzuconej hipotezy o władcy.

## P0 — role `kraj`, `emitent`, `władca` są nadal mieszane

Zrzuty: `39757.jpg`, `39767.jpg`, `39769.jpg`.

- Talar oblężniczy Gdańska 1577 jest poprawnie rozpoznany jako talar, srebro, Gdańsk, 1577.
- `Władca: Nie ustalono` jest w tym przypadku zachowaniem prawidłowym: postacią jest Chrystus, a emitentem miasto Gdańsk. Stefan Batory jest kontekstem historycznym, nie portretem ani emitentem tej monety.
- Pole `Kraj / emitent: Polska` jest jednak niejednoznaczne. Powinny istnieć osobne pola: `kraj/obszar = Polska` oraz `emitent = miasto Gdańsk`.
- Formularz korekty używa wspólnego pola `Władca / emitent`, co utrwala ten sam błąd modelu danych i może prowadzić do zapisania osoby zamiast miasta lub odwrotnie.

Oczekiwane zachowanie:

1. Rozdzielić w danych i UI: kraj/obszar, emitent, władca okresu, postać na monecie.
2. Formularz korekty ma pozwalać poprawiać te role niezależnie.
3. Dla emisji miejskich tytuł i karta nie powinny wymagać władcy, jeżeli emitent i typ są ustalone.

## P1 — wynik źródłowy nie jest dostatecznie oczyszczony po wyborze monety

Zrzut: `39757.jpg`.

- Przy poprawnie ustalonym talarze 1577 nadal widoczna jest jako bliska pozycja kontrasygnatura na trojaku pruskim z 1546 roku.
- Rekord alternatywny z innym nośnikiem, nominałem i datą pierwotnej monety nie powinien być prezentowany na równych prawach z wybranym talarem.

Oczekiwane zachowanie:

1. Po wyborze kandydata oddzielić `potwierdzające źródło` od `odrzuconych alternatyw`.
2. Ukryć lub wyraźnie oznaczyć rekordy z twardymi sprzecznościami nominału, typu i legendy.

## P1 — niepełna lokalizacja danych dynamicznych

Zrzuty: `39763.jpg`, `39765.jpg`.

- Po przełączeniu na niemiecki etykiety interfejsu są niemieckie, ale opis `Odmiana / typ` pozostaje po polsku.
- Ostrzeżenie ma niemiecki nagłówek `Zusatzdaten müssen neu analysiert werden`, lecz polską treść `Dane pochodne unieważniono...`.
- Karta miesza przetłumaczone nazwy własne i wartości z nieprzetłumaczonymi komunikatami.

Oczekiwane zachowanie:

1. Wszystkie komunikaty systemowe muszą pochodzić z jednego rejestru i18n.
2. Dynamiczne opisy AI powinny być tłumaczone przy zmianie języka bez nadpisywania oryginału.
3. Jedna karta nie może jednocześnie zawierać polskich i niemieckich zdań systemowych.

## P1 — korekta i zapis mają niespójne stany danych

Zrzuty: `39765.jpg`, `39767.jpg`, `39769.jpg`.

- Edytowalne pola używają tekstu `Nie ustalono` jako wartości, a zapisana karta pokazuje `Bez daty`; stan pusty/nieznany nie ma jednej reprezentacji kanonicznej.
- Po korekcie `Pewność AI` zmienia się w `—`, ale karta nie wyjaśnia, że widoczne pola są danymi potwierdzonymi przez użytkownika, a nie aktywnym werdyktem AI.
- Komunikat mówi, że dane pochodne zostały unieważnione, lecz karta nadal może pokazywać opis stanu zachowania. Należy jawnie ustalić, które pola są niezależne od tożsamości, a które muszą zostać ponownie przeliczone.
- Zapis powinien wykrywać sprzeczne kombinacje również wtedy, gdy powstały po ręcznej korekcie. Użytkownik może je zachować świadomie, ale nie powinny wyglądać jak potwierdzone przez system.

Oczekiwane zachowanie:

1. Kanoniczne `null` dla braku danych; tłumaczone etykiety tylko w warstwie prezentacji.
2. Osobne oznaczenie pochodzenia każdego pola: AI, źródło, użytkownik, nierozstrzygnięte.
3. Po zmianie tożsamości unieważnić typ, rzadkość, numer katalogowy i zależną wycenę; stan zachowania zachować tylko z osobną informacją, że pochodzi z oceny obrazu.
4. Przed zapisem uruchomić walidację władca–rok–mennica–nominał–metal i pokazać konflikt.

## P1 — mobilny układ wyniku wychodzi poza ekran

Zrzuty: `39757.jpg`, `39759.jpg`.

- Wartości po prawej stronie są ucięte poza viewportem, szczególnie długi `Odmiana / typ` i `Stan zachowania`.
- Widok może wejść w poziome przesunięcie; prawa część nagłówka i wartości stają się niewidoczne.
- Dolny pasek akcji zasłania ostatnie pola i ogranicza możliwość oceny wyniku.

Oczekiwane zachowanie:

1. Kafelki danych: `min-width: 0`, zawijanie wartości i brak stałej szerokości wymuszającej overflow.
2. Brak poziomego scrolla na szerokości telefonu.
3. Dolny pasek akcji uwzględnia safe area i odpowiedni dolny padding treści.
4. Długie wartości na małym ekranie przechodzą pod etykietę zamiast znikać poza prawą krawędzią.

## Kolejność przyszłej naprawy

1. Końcowy chronology/consistency guard po Etapie 2 i przed zapisem.
2. Ochrona potwierdzonego wyniku Etapu 1 przed słabszą hipotezą Etapu 2.
3. Rozdzielenie ról emitenta, władcy, kraju i postaci.
4. Normalizacja korekty, pochodzenia pól i stanów `null`.
5. Pełna lokalizacja treści dynamicznych.
6. Naprawa mobilnego overflow i dolnego paska.
7. Ponowna regresja na talarze 1577, dukacie 1551 i co najmniej jednym talarze Jana III Sobieskiego.

## Zakres tej aktualizacji

- Nie zmieniono kodu aplikacji.
- Nie uruchomiono wdrożenia.
- Nie zmieniono danych produkcyjnych ani zapisanych monet użytkownika.
- Dokument jest wyłącznie rejestrem usterek do kolejnego, osobno zatwierdzonego etapu pracy.
