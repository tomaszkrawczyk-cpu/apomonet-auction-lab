# ApoMonet — QA / regresja / wydajność

Ten plik jest obowiązkową checklistą przed przeniesieniem zmian z gałęzi stabilizacyjnej na `main`.

## Krytyczny przepływ użytkownika
- [ ] Start otwiera się bez błędów i bez utraty zapisanych danych.
- [ ] Awers: dotknięcie całego kafla otwiera aparat/wybór pliku.
- [ ] Rewers: dotknięcie całego kafla otwiera aparat/wybór pliku.
- [ ] Po zatwierdzeniu obu zdjęć przycisk „Szybka analiza” staje się aktywny.
- [ ] Kadrowanie zachowuje cały rant i bezpieczny margines; nie ucina rocznika ani legendy.
- [ ] Analiza nie rusza, gdy brakuje jednej strony.
- [ ] Wynik analizy pokazuje dane i poziom pewności.
- [ ] „Najpierw popraw dane” otwiera korektę właściwej monety.
- [ ] Zapis korekty wraca do tej samej sesji analizy.
- [ ] Poprawiona wartość zastępuje wcześniejszy wynik AI bez utraty zdjęć.
- [ ] „Zapisz do kolekcji” nie tworzy niechcianych duplikatów przy kolejnym zapisie.
- [ ] „Zapisz i wybierz album” zachowuje monetę i zdjęcia.

## Kolekcja i albumy
- [ ] Moneta jest widoczna po zapisie.
- [ ] Edycja ręczna nie usuwa pól, których użytkownik nie zmienił.
- [ ] Usuwanie monety działa tylko po świadomej akcji użytkownika.
- [ ] Lista / małe kafelki / duże kafelki zachowują ustawienie.
- [ ] Filtry nie zmieniają danych — tylko widok.
- [ ] Przenoszenie Moje / Cele / Marzenia nie tworzy drugiego egzemplarza.
- [ ] Przeniesienie do „Moja kolekcja” jest trwałe po odświeżeniu.
- [ ] Przywrócenie demo dotyczy wyłącznie demonstracyjnych danych.

## Eksport i udostępnianie
- [ ] Można zaznaczyć jedną dowolną monetę.
- [ ] Można zaznaczyć kilka monet.
- [ ] „Zaznacz wszystko” i „Odznacz wszystko” działają poprawnie.
- [ ] PDF zawiera wyłącznie wybrane monety.
- [ ] Miniatury w eksporcie nie są rozciągnięte ani obcięte.
- [ ] Eksport nie zawiera danych prywatnych, których użytkownik nie wybrał.
- [ ] Systemowe „Udostępnij” otwiera menu Androida, gdy jest wspierane.
- [ ] Brak Web Share API daje czytelny komunikat/fallback.

## Kalendarz aukcji
- [ ] Dom aukcyjny jest widoczny bez otwierania wydarzenia.
- [ ] Filtry Polska / Zagraniczne / Wszystkie działają.
- [ ] „Moje domy aukcyjne” zapamiętują wybór.
- [ ] Jedna aukcja nie jest bez potrzeby dublowana z wielu źródeł.
- [ ] Każda pozycja pokazuje źródło i prowadzi do oryginalnej strony.
- [ ] Nie kopiujemy cudzych opisów, zdjęć ani katalogów bez podstawy prawnej.

## Wielojęzyczność
- [ ] Zmiana języka nie tłumaczy historycznej legendy monety ani nazw własnych w danych katalogowych.
- [ ] Wybrany język pozostaje po odświeżeniu.
- [ ] Najważniejsze ekrany nie mieszają dwóch języków w podstawowych przyciskach.
- [ ] PL / EN / DE są zawsze kompletne dla funkcji produkcyjnych.
- [ ] Pozostałe języki nie blokują działania aplikacji, nawet jeśli brakuje pojedynczego tłumaczenia.

## Prywatność i bezpieczeństwo
- [ ] Start aplikacji nigdy automatycznie nie kasuje kolekcji ani historii.
- [ ] Aktualizacja wersji nie nadpisuje istniejącego `localStorage` bez migracji.
- [ ] Kolekcja nie jest publicznie dostępna przez URL.
- [ ] Klucze API nie trafiają do kodu klienta ani repozytorium.
- [ ] Błędy serwera nie ujawniają sekretów ani pełnych danych diagnostycznych użytkownikowi.
- [ ] Zewnętrzne zdjęcia demonstracyjne są wyraźnie oddzielone od prywatnych zdjęć użytkownika.

## Budżet wydajności
- [ ] Brak ciężkiej biblioteki dodanej tylko dla jednej drobnej funkcji.
- [ ] Listy i albumy używają miniaturek / `loading="lazy"`.
- [ ] Pełne zdjęcia monet nie są ładowane hurtowo przy wejściu na listę.
- [ ] Analiza obrazu po stronie telefonu pracuje na zmniejszonej kopii do detekcji, nie na pełnym zdjęciu piksel po pikselu.
- [ ] Dane statyczne nie są pobierane ponownie przy każdym kliknięciu.
- [ ] Kalendarz nie uruchamia masowych zapytań do wielu źródeł przy każdym renderze.
- [ ] Brak niekontrolowanego wzrostu historii; limit wpisów pozostaje aktywny.
- [ ] PDF/XLSX są generowane dopiero na żądanie użytkownika.

## Bramka przed `main`
Zmiana nie może wejść na produkcję, jeśli:
1. kasuje lub migruje dane bez planu odzyskania,
2. pogarsza krytyczny przepływ analizy,
3. ujawnia prywatne dane,
4. dodaje istotne obciążenie bez uzasadnienia,
5. nie ma stanu błędu/fallbacku,
6. psuje działanie na telefonie.
