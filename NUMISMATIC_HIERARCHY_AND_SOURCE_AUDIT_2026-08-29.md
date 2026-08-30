# APOMONET — hierarchia bazy i audyt zebranego materiału (2026-08-29)

## Decyzja architektoniczna

Baza nie jest już traktowana jako jedna lista „monet”. Każdy dopuszczony rekord przechodzi przez siedem poziomów:

1. okres historyczny;
2. emitent lub władca;
3. rodzina nominału;
4. typ nadrzędny (`coinTypeId`);
5. emisja: rocznik/zakres, mennica i rodzaj obiektu (`issueId`);
6. odmiana: metal oraz jawnie opisana próba/wariant/rodzaj bicia (`varietyId`);
7. egzemplarz źródłowy z prawami i proweniencją (`specimenId`).

Interpunkcja, drobne różnice liter, pojedynczy punkt, pęknięcie stempla i inne mikroróżnice nie tworzą automatycznie nowej odmiany. Są przechowywane jako cechy/fingerprint do czasu niezależnego potwierdzenia. Zapobiega to rozdmuchaniu katalogu i fałszywej precyzji.

## Wynik porządkowania

| Jednostka | Liczba | Znaczenie |
|---|---:|---|
| Egzemplarze źródłowe | 22 146 | jeden rekord instytucji lub dozwolonego źródła |
| Typy nadrzędne | 2 386 | rodziny katalogowe po normalizacji nazw |
| Emisje | 5 724 | typ + rok/zakres + mennica |
| Odmiany jawne | 5 995 | emisja + metal + potwierdzone pole wariantu/próby/bicia |
| Emisje z co najmniej 2 źródłami | 397 | rzeczywiste potwierdzenie wieloźródłowe |
| Odmiany z co najmniej 2 źródłami | 297 | potwierdzenie na dokładniejszym poziomie |
| Typy oznaczone do ręcznej kontroli | 288 | 232 rodziny z emitentem zapisanym jedynie jako „Polska” oraz 59 średniowiecznych rodzin bez dostatecznego wyróżnika; część typów ma obie flagi |
| Egzemplarze z dowolnym obrazem | 14 149 | obraz ma jawny status prawny źródła |
| Egzemplarze z parą obrazów | 6 246 | para awers–rewers lub dwa widoki źródłowe |

Silnik rozpoznawania konsoliduje teraz kilka rekordów tej samej emisji po trwałym `issueId`. Różna pisownia typu „Warszawa / Warsaw / Mennica Państwowa” albo „Jan Kazimierz / Jan II Kazimierz Waza” nie powinna już sama tworzyć konkurencyjnych wyników.

## Co rzeczywiście trafiło do pozytywnego runtime

Największe warstwy to:

| Warstwa | Rekordy | Rola |
|---|---:|---|
| Cyfrowe MNW | 7 785 | public-domain egzemplarze polskich monet |
| MNK Zbiory Cyfrowe | 5 810 | public-domain egzemplarze i pary zdjęć |
| Czapski, tomy I–V | 2 931 | przetworzone fakty i numery pozycji, bez skanów/prozy |
| ANS MANTIS | 1 979 | metadane i potwierdzenia międzyzbiorowe |
| III RP 1995–2024 | 896 | wersjonowane fakty emisyjne bez chronionych zdjęć |
| Polskie próby 1949–1994 | 502 | otwarte fakty techniczne i typologiczne |
| PRL 1949–1989 | 257 | otwarte fakty z odwołaniami ELI/ISAP |
| NBP/ELI 2023–2026 | 82 rekordy runtime (83 rekordy źródłowe przed deduplikacją) | bieżące fakty oficjalne |

Europeana i IKMK pozostają warstwami metadanych/potwierdzeń. Data digitalizacji Europeany nie może być użyta jako data emisji. Obrazy IKMK są dopuszczane tylko wtedy, gdy konkretny rekord deklaruje zgodną licencję.

## Dawne kolekcje, skarby i katalogi

Zebrany materiał został oddzielony od pozytywnej identyfikacji i ułożony jako indeks proweniencji:

| Zbiór | Zakres | Tryb w APOMONET |
|---|---:|---|
| Zygmunt von Chełmiński, 1904 | 1 997 pozycji | bibliografia, lot i kandydat proweniencji |
| Otto von Kubicki, 1908 | 2 206 pozycji | bibliografia, lot i kandydat proweniencji |
| M. Frankiewicz, 1930 | 957 pozycji | `REFERENCE_ONLY`; skan oznaczony „In Copyright” |
| Wiktor Chomiński, 1932 | 712 pozycji | `REFERENCE_ONLY`; osobna osoba od Chełmińskiego |
| Henry V. Karolkiewicz, Triton IV | numeracja 2001–3076; katalog raportuje 1 056 lotów | kompletna hierarchia sekcji, bez kopiowania opisów i fotografii |
| Potoccy w MNW | 1 705 obiektów public-domain zaobserwowanych; 1 095 w bieżącym przecięciu runtime | promocja wyłącznie obiekt po obiekcie |
| Kazimierz Sobański w MNW | 187 obiektów public-domain; 157 w przecięciu runtime | falsyfikat/odlew nigdy nie trafia do pozytywnej bazy |
| Kazimierz Zbichorski | ponad 1 500 numizmatów, ponad 2 000 fotografii, ok. 1 600 negatywów według publikującego | materiał licencyjny do pozyskania; obecnie link i proweniencja |
| Skarb złoty z Koszyc | 2 920 złotych monet, raportowane 38 polskich | fakty zbiorcze i bibliografia; katalog/zdjęcia wymagają praw |

Suma 6 948 oznacza numery pozycji lub wielkość zakresów pięciu katalogów aukcyjnych, a nie 6 948 różnych typów monet. Zidentyfikowano trzy kandydackie połączenia egzemplarzy: Karolkiewicz 2096 → Chełmiński 59, Karolkiewicz 2139 → Frankiewicz 97 i Karolkiewicz 2326 → Chełmiński 891. Pozostają one `REFERENCE_ONLY` do kontroli stron katalogowych.

## Co zostało świadomie odrzucone

- chronione opisy aukcyjne i muzealne;
- tablice i fotografie bez item-level licencji;
- automatyczne przenoszenie numerów Kopickiego, Parchimowicza albo ocen rzadkości;
- uznawanie nazwy dawnej kolekcji za dowód typu lub autentyczności;
- łączenie Chomińskiego i Chełmińskiego jako wariantów tej samej nazwy;
- automatyczne tworzenie odmian z każdej różnicy interpunkcyjnej;
- pozytywny werdykt autentyczności na podstawie braku podobieństwa do znanego falsyfikatu.

## Priorytet pozostałych prac

1. **PRL — legalne pary awers–rewers.** Dane techniczne są dobre, ale tylko 10 par obejmuje 461 jawnych odmian z lat 1949–1989. Największy wzrost jakości da licencja muzealna lub świadoma licencja użytkowników, nie kolejny katalog tekstowy.
2. **Średniowiecze i emitenci ogólni — 288 flagowanych rodzin.** W tej liczbie jest 59 średniowiecznych rodzin bez dostatecznego wyróżnika oraz 232 rodziny, w których źródło podaje emitenta tylko jako „Polska” (z częściowym nakładaniem flag). Potrzebne są atomy typologiczne: układ krzyży i punktów, wariant korony/orła, zakończenia legend, znaki i przypisanie do mennicy/władcy. Do czasu domknięcia aplikacja ma zatrzymywać się na rodzinie.
3. **II RP — znaki mennicze.** Dziesięć rodzin wielomenniczych wymaga markerów wizualnych; rok sam nie może rozdzielać mennicy ani odmiany.
4. **Zabory, powstania, Jagiellonowie i monarchia elekcyjna.** Potrzebna jest ręczna kontrola kolizji nazw władców, miast i mennic. Struktura jest gotowa; kontrola ma następować gałąź po gałęzi.
5. **Potwierdzenia wieloźródłowe.** 397 emisji to za mało względem 5 724. Najpierw należy wzmacniać emisje mylone i rzadkie, a nie najłatwiejsze rekordy.
6. **Polski korpus negatywny.** Obecne 89 legalnych obrazów jest odseparowane poprawnie, lecz brakuje polskich przykładów usuniętego znaku mennicy, przerobionej daty, odlewu i repliki.
7. **Licencje i współpraca.** Zbichorski oraz fotografie katalogów historycznych mają dużą wartość, ale bez zgody pozostają poza treningiem i runtime. Publiczny dostęp nie jest zgodą na kopiowanie.

## Pliki źródła prawdy

- `data/recognition/recognition-hierarchy-v1.json.gz` — pełne drzewo i statystyki;
- `data/recognition/recognition-hierarchy-runtime-v1.json.gz` — odchudzona mapa identyfikatorów używana przez silnik;
- `data/research/historical-collection-index-v1.json` — kolekcje, prawa, zakresy i krawędzie proweniencji;
- `data/recognition/source-registry-v1.json` — dopuszczalne role źródeł;
- `data/recognition/gap-closure-audit-v1.json` — audyt maszynowy;
- `NUMISMATIC_GAP_CLOSURE_2026-08-29.md` — bieżący raport luk.

APOMONET nadal jest narzędziem wstępnej identyfikacji. Hierarchia pozwala powiedzieć „typ ustalony, odmiana wymaga lepszego zdjęcia”, zamiast wymuszać dokładny wariant bez wystarczających danych.
