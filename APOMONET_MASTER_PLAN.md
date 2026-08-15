# APOMONET — MASTER PLAN

Status: dokument nadrzędny projektu. Aktualizujemy go przed i po każdej większej zmianie.

## Zasady nienaruszalne
1. Nie psujemy działających funkcji przy wdrażaniu nowych. Zmiany małymi krokami, po każdym kroku test przepływu.
2. Prywatność kolekcji jest domyślna. Nie publikujemy danych użytkownika ani kolekcji bez świadomej akcji użytkownika.
3. Nie kopiujemy bez praw katalogów, opisów i fotografii. Integracje aukcyjne preferują dane faktograficzne, legalne API/linki i odsyłanie do źródła.
4. AI nigdy nie udaje pewności: pokazuje poziom pewności, pozwala poprawić wynik i zachowuje korektę w tej samej sesji.
5. Kopicki/rzadkość/autentyczność/grading tylko gdy istnieje wystarczające oparcie; brak danych oznaczamy wprost.
6. Wydajność: miniatury zamiast pełnych zdjęć na listach, lazy loading, brak ciężkich bibliotek bez potrzeby, brak masowych zapytań przy starcie, cache preferencji i danych statycznych.
7. UI: mobile-first, ciemny motyw ApoMonet, pomarańczowo-złote akcenty, czytelne duże cele dotykowe, spójny wygląd wszystkich ekranów.
8. Wielojęzyczność jest częścią architektury, nie dodatkiem na końcu.

## Status funkcji
Legenda: ✅ działa / 🟡 częściowo / 🔴 brak / 🔵 etap PRO/LAB / ⚠️ wymaga testu regresji

### A. Fundament i UI
- 🟡 Responsywny webowy prototyp/PWA.
- 🟡 Spójny UI ApoMonet — część ekranów wymaga dalszego ujednolicenia.
- 🟡 Dashboard: istnieje Start, ale brakuje pełnego podsumowania kolekcji, ostatnich monet i wartości.
- 🟡 Wielojęzyczność: wspólny mechanizm istnieje; pełne pokrycie ekranów do audytu. Języki docelowe z ustaleń: PL, EN, DE, FR, ES, IT, UK, RU; dodatkowo CZ.
- 🔴 Docelowe aplikacje Flutter: Android, iOS, Windows, macOS, Linux.

### B. Zdjęcie i analiza
- 🟡 Awers/rewers z aparatu i pliku — pełny przepływ zweryfikowany w wersji preview; pozostaje fizyczny test Androida.
- 🟡 Automatyczne kadrowanie — bezpieczny margines i powrót do całego zdjęcia przy niepewnym wykryciu są wdrożone i przetestowane; pozostaje test realnych monet na Androidzie.
- 🔴 Ocena jakości zdjęcia przed analizą.
- 🔴 Obsługa wielu monet na jednym zdjęciu (PRO).
- 🟡 Identyfikacja: nominał, władca/emitent, rok, mennica, metal — wymaga poprawy niezawodności.
- 🟡 Poziom pewności dla pól identyfikacji — UI pokazuje osobno pewność władcy, roku i nominału; wymaga benchmarku na realnych monetach.
- 🟡 Korekta po analizie — sesja, oba zdjęcia, `rawAI` i dane zaakceptowane przez użytkownika przeszły pełny test preview; pozostaje test Androida.
- 🟡 Waga i średnica jako dane korygujące identyfikację — pola i przekazanie do dalszej analizy są wdrożone.
- 🟡 „Czy mam już tę odmianę?” — działa ostrożne wykrycie możliwego duplikatu podstawowej tożsamości.
- 🔵 Porównanie stempli 1:1.
- 🔵 Wykrywanie tego samego egzemplarza w archiwach.
- 🔵 AI grading.
- 🔵 Wspomagana ocena autentyczności z jasnym zastrzeżeniem, że nie jest certyfikatem/ekspertyzą.

### C. Kolekcja i albumy
- ✅ Kolekcja i ręczna edycja monet.
- ✅ Zapisana moneta ma otwieraną kartę z awersem, rewersem i danymi zaakceptowanymi przez użytkownika.
- 🟡 Historia korekt/danych istnieje technicznie, wymaga kompletnego UI i testu sesji.
- 🟡 Albumy Moje / Cele / Marzenia z miniaturami demonstracyjnymi.
- 🟡 Przenoszenie między albumami — wdrożone, wymaga testu regresji.
- ✅ Widok lista / małe kafelki / duże kafelki z zapamiętaniem preferencji.
- 🟡 Filtry: władca, nominał, mennica, metal, rzadkość i stan są wdrożone; epoka wymaga ujednolicenia.
- 🟡 Notatki eksperta są edytowalne i oddzielone od zachowanego `rawAI`; UI historii wymaga dalszego dopracowania.
- 🟡 Historia/proweniencja egzemplarza ma podstawowe pola i historię zmian; pełny model nadal do rozbudowy.
- 🔴 Dodaj z aukcji do Moje/Cele/Marzenia.
- 🟡 Pełny podział historyczny: demo obejmuje szeroki zakres, katalog wymaga kompletnego modelu, w tym Andegawenów, okresu wojennego, prób, destruktów i błędów menniczych.

### D. Wycena
- 🟡 „Podaj wartość mojej kolekcji” — obecnie suma zapisanych wycen.
- 🔴 Wycena z realnych porównywalnych wyników aukcyjnych.
- 🔴 Zakres cenowy z uwzględnieniem stanu/odmiany.
- 🔴 Historia zmian wartości i wykres.
- 🔴 ROI: cena zakupu vs wartość bieżąca.
- 🔴 Wartość wg władcy, mennicy, nominału i innych przekrojów.
- 🔴 Rzadkość wg Kopickiego tylko przy wiarygodnym dopasowaniu.

### E. Aukcje
- 🟡 Kalendarz aukcji z filtrami Polska/Zagraniczne/Wszystkie.
- 🟡 „Moje domy aukcyjne” i zapamiętanie wyboru.
- 🟡 Nazwa domu aukcyjnego jako główny element kafla.
- 🟡 Źródła/linki do aukcji — prototyp; docelowo OneBid, WCN, Niemczyk, GNDM, NumisBids, ACSearch, CoinArchives, Sixbid, Stack's Bowers, Heritage, Coinstrail oraz bezpośrednie legalne źródła.
- 🔴 Pełne legalne zasilanie kalendarza aktualnymi danymi.
- 🔴 Obserwowanie monet/aukcji i powiadomienia.
- 🔴 „Szukaj tej monety na aukcjach” z Celów/Marzeń.

### F. Eksport i udostępnianie
- 🟡 Zaznaczanie pojedynczych monet do eksportu — wdrożone w albumach demo, wymaga testu.
- 🟡 PDF z wybranych — ekran drukowania/zapisu PDF; wymaga dopracowania raportu i testu zdjęć.
- 🟡 Udostępnianie przez system telefonu — wdrożone, wymaga testu Android.
- ✅ Prawdziwy XLSX jest generowany dla wybranych monet; pozostaje test pobierania na Androidzie.
- 🔴 Raporty kolekcji wg władców, mennic, wartości itd.
- 🔴 Bezpieczne opcje redakcji danych w pliku przed wysyłką.

### G. Bezpieczeństwo i prywatność
- 🟡 Prototyp przechowuje dane lokalnie w przeglądarce, ale to nie jest docelowy poziom ochrony.
- 🔴 Docelowa lokalna baza SQLite/SQLCipher + AES-256 w aplikacji natywnej.
- 🔴 PIN i biometria/Face ID.
- 🔴 Zaszyfrowana kopia zapasowa i przywracanie.
- 🔴 Model prywatności/zgód i minimalizacja danych.
- 🔴 Audyt bezpieczeństwa przed komercyjnym wydaniem.

### H. STANDARD / PRO / LAB
- 🟡 Model ustalony koncepcyjnie.
- STANDARD: do 100 monet, podstawowe AI, 1 moneta na zdjęciu, limitowany PDF.
- PRO: bez limitu, pełne AI, wiele monet, Excel, historia egzemplarza, dodawanie z aukcji.
- LAB/PRO: stemple 1:1, ten sam egzemplarz, grading, wspomagana autentyczność.
- 🔴 Egzekwowanie limitów i uprawnień w aplikacji.

## Kolejność wdrażania — bez demolowania prototypu

### Etap 0 — stabilizacja przed nowymi funkcjami
1. Audyt wszystkich ekranów i działających przepływów.
2. Lista testów regresji: Start → Analiza → zdjęcia → analiza → korekta → zapis → kolekcja → album → przeniesienie → zaznaczenie → PDF/udostępnienie; Kalendarz → filtry → Moje domy → źródło.
3. Ujednolicenie danych i migracje localStorage bez kasowania danych użytkownika.
4. Audyt wielojęzyczności i brakujących tłumaczeń.
5. Audyt wydajności zdjęć, list i startu aplikacji.

Kamień milowy 2026-08-15: najważniejszy przepływ zdjęcia → analiza → korekta → zapis → ponowne otwarcie przeszedł automatyczny test E2E na wersji preview. Produkcja pozostała bez zmian. Przed uznaniem kryterium mobilnego za zamknięte pozostaje test fizycznego Androida z realnymi zdjęciami.

### Etap 1 — najważniejszy przepływ monety
1. Bezpieczne kadrowanie z marginesem całego rantu.
2. Ocena jakości zdjęcia.
3. Stabilna sesja analizy po korekcie.
4. Pola pewności AI i jasne „nie wiem”.
5. „Czy mam już tę odmianę?”.
6. Notatki eksperta.

### Etap 2 — kolekcja, albumy, eksport
1. Pełne filtry: metal/rzadkość/stan.
2. Przenoszenie i historia zmian.
3. PDF z wybranych z miniaturami.
4. Prawdziwy XLSX.
5. Bezpieczne udostępnianie z wyborem danych.
6. Dashboard wartości i ostatnich monet.

### Etap 3 — aukcje i wycena
1. Legalne źródła danych i warstwa źródeł.
2. Dodaj z aukcji.
3. Szukaj monety na aukcjach.
4. Wycena porównawcza i zakres.
5. Historia wartości/ROI.
6. Powiadomienia o obserwowanych aukcjach/domach/monetach.

### Etap 4 — bezpieczeństwo natywne
1. Flutter + lokalna baza SQLCipher.
2. Szyfrowanie, PIN, biometria.
3. Backup/restore.
4. Migracja danych z prototypu.
5. Audyt prywatności i bezpieczeństwa.

### Etap 5 — PRO/LAB
1. Wiele monet na zdjęciu.
2. Porównanie stempli 1:1.
3. Ten sam egzemplarz w archiwach.
4. AI grading.
5. Wspomagana ocena autentyczności.

## Kryterium ukończenia każdej pozycji
Funkcja jest „gotowa” dopiero gdy: działa na telefonie; nie psuje istniejących przepływów; nie gubi danych; ma sensowny stan błędu/pusty; respektuje wybrany język; nie ujawnia danych bez akcji użytkownika; nie ładuje ciężkich zasobów bez potrzeby; i przechodzi test regresji najważniejszego przepływu.
