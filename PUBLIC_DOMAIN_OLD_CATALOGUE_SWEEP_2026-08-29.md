# APOMONET — dawne katalogi i aukcje (2026-08-29)

## Wynik

Przegląd dawnych katalogów daje wartościowy materiał, ale nie działa zasada „stary katalog = wolny katalog”. Nieistnienie domu aukcyjnego także nie wygasza praw. Dla APOMONET każda pozycja otrzymuje osobną decyzję dotyczącą faktów, tekstu, fotografii/tablicy, skanu oraz regulaminu repozytorium.

Do pozytywnego runtime dodano **3 nowe świadectwa źródłowe**:

- dukat ryski Zygmunta III Wazy, Ryga, 1588 — zgodny z pięcioma rekordami MNK/MNW;
- dwudukat gdański Władysława IV Wazy, Gdańsk, 1642 — zgodny z rekordem MNW NPO 3002.
- dukat warszawski powstania listopadowego, 1831 — dwa notowania w Spinku 1900 połączono z tym samym typem muzealnym MNK/MNW i policzono jako jedno świadectwo źródłowe.

Nie dodano żadnego zdjęcia bez jednoznacznej licencji. Nie przepisano opisów, układu katalogów ani cen z niepewnie wyrównanego OCR.

## Decyzje źródłowe

| Źródło | Zakres | Decyzja | Co wykorzystujemy |
|---|---:|---|---|
| Spink, *Numismatic Circular* 1900, Commons | 707 stron | `OPEN_SCAN` / `PARTIALLY_PROMOTED` | 79 stron kandydackich, 75 tylko badawczych; zapisujemy indeks, tokeny i skróty stron, bez redystrybucji OCR i obrazów |
| Spink, *Numismatic Circular* 1902 | 371 stron | `FACTS_ONLY` | własny zapis faktów, bibliografia i link; bez redystrybucji skanu/OCR |
| Spink, *Numismatic Circular* 1908 | 4 wzmianki o polskich monetach | `FACTS_ONLY` | 2 wzmianki potwierdzone muzealnie w runtime, 2 w kolejce badawczej |
| Adolph Hess Nachfolger 1906 | loty 2253–2633 (381 pozycji) | `REFERENCE_ONLY_IN_COPYRIGHT` | indeks lotów i kierowana kontrola; bez opisów i 3 tablic |
| Felix Schlessinger 1929 | 214 pozycji oznaczonych jako Polska | `REFERENCE_ONLY_IN_COPYRIGHT` | indeks zakresów i kierowana kontrola; bez opisów i fotografii |
| Eugen Merzbacher 1903 | loty 1–830 (830 pozycji) | `REFERENCE_ONLY_IN_COPYRIGHT` | bardzo wartościowa kolejka Gdańsk–Toruń–Elbląg; bez opisów i obrazów |
| Adolph E. Cahn 1924 | loty 1050–1202 (153 pozycje) | `REFERENCE_ONLY_IN_COPYRIGHT` | indeks działu Polska; bez opisów i 16 tablic całego katalogu |
| Leo Hamburger / Wiktor Chomiński 1932 | loty 1–712, 7 tablic | `REFERENCE_ONLY_IN_COPYRIGHT` | pozostaje w istniejącym indeksie proweniencji; bez kopiowania zawartości |

Łącznie z czterech wcześniej niezindeksowanych katalogów chronionych zapisano **1578 numerów pozycji polskich** jako kolejkę, nie jako gotowe rekordy monet.

## Pozycje zatrzymane do wyjaśnienia

1. **Stefan Batory, 1579, złota odbitka denara gdańskiego.** Nie wolno jej spłaszczyć do zwykłego dukata. Potrzebne jest drugie źródło typologiczne potwierdzające odbitkę w innym metalu.
2. **Zygmunt III Waza, 1630, dwa półtalary.** Liczba „2” opisuje liczbę egzemplarzy, a nie nominał „dwutalar”. Mennica nie została podana, więc wpisu nie połączono automatycznie z półtalarem toruńskim.
3. **Gdańsk, 1558, Richtstück denara.** Termin może oznaczać wzorzec menniczy lub próbę. Przed utworzeniem typu potrzebna jest specjalistyczna kontrola klasy obiektu.
4. **Medal Jana III Sobieskiego z 1683 r.** Prawidłowo wyłączony z pozytywnego katalogu monet.

## Korekta hierarchii

Mennicę włączono do kontekstu rodziny typu. Dzięki temu skrócony tytuł MNW „Dukat ryski” i pełniejszy rekord MNK „dukat ryski, Ryga” nie tworzą już dwóch typów. Po przebudowie:

- 22 149 egzemplarzy źródłowych;
- 2 785 typów nadrzędnych;
- 5 926 emisji;
- 6 291 odmian;
- 422 emisje z co najmniej dwoma niezależnymi źródłami.

## Następna kolejka

Skan Spinka 1900 został przeszukany według władców, mennic i nazw `Poland`, `Polen`, `Danzig`, `Thorn`, `Elbing`, `Riga`. Z 79 stron kandydackich dwie zawierają powtórne notowania tego samego dukata 1831 i dały jedno potwierdzone świadectwo; 75 stron pozostaje w kolejce, a dwie strony z medalami i znakami miejskimi wyłączono z pozytywnego katalogu. Katalogi Merzbacher 1903, Hess 1906, Cahn 1924 i Schlessinger 1929 służą wyłącznie jako indeks numerów lotów oraz trop do niezależnych rekordów muzealnych, nie jako źródło fotografii.

Szczegółowe dane maszynowe znajdują się w `data/research/public-domain-catalogue-sweep-v1.json` i `data/research/spink-1900-selective-extraction-v1.json`, a trzy dopuszczone rekordy w `data/recognition/historical-sale-facts-v1.json`.
