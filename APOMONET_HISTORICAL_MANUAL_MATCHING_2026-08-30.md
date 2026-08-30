# APOMONET — ręczne dopasowanie dawnych katalogów, partia 1

Data kontroli: 2026-08-30

## Wynik

- Ręcznie sprawdzono 5 pozycji/stron.
- Potwierdzono 3 łańcuchy katalogowe.
- Wzmocniono 2 istniejące typy runtime bez tworzenia duplikatów.
- Nie dodano żadnego nowego pozytywnego typu wyłącznie na podstawie aukcji.
- Nie potwierdzono żadnego konkretnego egzemplarza bez legalnego porównania zdjęć.
- Nie zaimportowano zdjęć, tablic, OCR ani chronionych opisów.
- Zamknięto 1 fałszywy trop OCR.
- Dodano 1 rodzinę pomyłek dla monety gospodarza z kontrmarką.

## Ręczne ustalenia

### Spink 1900, karta skanu 143

Trafienie jest kontekstowe i nie zawiera pozycji polskiej monety. Polska występuje w proweniencji innego obiektu, nazwy mennic w nocie bibliograficznej, a Portugalia w innym artykule. Status: `REVIEWED_NO_POLISH_COIN_MATCH`.

### Spink 1900, karta skanu 384

Notowanie 67529 jest trzecim wystąpieniem istniejącego typu dukata warszawskiego 1831. Nie tworzy nowego typu ani nowego niezależnego źródła. Występujący na tej samej stronie dukat Krzysztofa Batorego 1580 jest siedmiogrodzki i nie został przypisany Stefanowi Batoremu.

### Karolkiewicz 2096 — Chełmiński 59

Potwierdzono łańcuch katalogowy dla toruńskiej złotej odbitki prezentacyjnej ze stempli talara z 1533 r., odpowiadającej wadze dziesięciu dukatów. Brak instytucjonalnego rekordu w aktualnym runtime, dlatego pozycja pozostaje badawcza.

### Karolkiewicz 2139 — Frankiewicz 97

Potwierdzono, że jest to moneta gospodarza Filipa II z Neapolu z kontrmarką Zygmunta II Augusta i datą 1564, a nie zwykły talar litewski z Wilna. Pozycja pozostaje badawcza, ale zasiliła twardą bramkę bezpieczeństwa: widoczna kontrmarka blokuje wybór regularnego, podobnego typu gospodarza.

### Karolkiewicz 2326 — Chełmiński 891

Potwierdzono łańcuch katalogowy i zgodność typu: Jan Kazimierz, półtalar gdański 1650. Rekord MNK `mnk:127042` potwierdza typ `type_7d04f4fd46eddec7` i emisję `issue_cef8e11a34ea6d42`. Nie twierdzimy, że rekord muzealny i lot aukcyjny są tym samym egzemplarzem.

## Wpływ na runtime

- Stage 1 zapisuje kontrmarkę/kontrsygnaturę w `mintMarks` oraz rozdziela emitenta gospodarza od emitenta kontrmarki.
- Rodzina `counterstamped-host-coin` zatrzymuje wybór, gdy widoczna kontrmarka nie występuje w zweryfikowanym kandydacie.
- Przy takim konflikcie pomijany jest kosztowny wizualny reranking, ponieważ lista nie zawiera prawidłowego typu.
- Benchmark respektuje obecnie bramkę silnika i nie podstawia sztucznie pierwszego kandydata po decyzji o wstrzymaniu.

## Benchmark przed i po

| Metryka | Przed | Po |
|---|---:|---:|
| Przypadki | 33 | 34 |
| Pozytywne | 26 | 26 |
| Wymagające wstrzymania | 7 | 8 |
| Top-1 typu | 100% | 100% |
| Top-3 typu | 100% | 100% |
| Poprawne wstrzymanie | 100% | 100% |
| Fałszywie pewne odpowiedzi | 0% | 0% |
| Lokalny p50 | 16,754 ms | 16,963 ms |
| Lokalny p90 | 23,730 ms | 21,598 ms |

Różnica czasu lokalnego jest mała i zależna od środowiska; nie jest traktowana jako udowodnione przyspieszenie. Benchmark nie wywołuje API, więc koszt AI pozostaje `niezmierzony`. Nowa bramka może oszczędzić jedno wywołanie wizualnego rerankingu dla rozpoznanej kontrmarki, lecz wymaga to osobnego pomiaru end-to-end.

## Stan materiału

- Spink 1900: 707 stron przeskanowanych, 79 stron kandydujących, 73 nadal badawcze, 3 karty wzmacniają jeden istniejący typ, 2 wyłączone jako obiekty niebędące monetami, 1 zamknięta jako fałszywy trop.
- Ręczna partia: 2 pozycje pozostają wyłącznie badawcze, 1 typ ma bezpieczne powiązanie na poziomie typu, 0 powiązań na poziomie konkretnego egzemplarza.
- Pokrycie nowymi zdjęciami: 0; ta partia celowo nie kopiowała zdjęć aukcyjnych.

## Źródła kontrolne

- Spink 1900: <https://archive.org/details/spinkcircular1900v08v09>
- Chełmiński 1904: <https://digi.ub.uni-heidelberg.de/diglit/otto_helbing1904_04_25>
- Frankiewicz 1930: <https://digi.ub.uni-heidelberg.de/diglit/schlessinger1930_09_15>
- Karolkiewicz 2096: <https://one.bid/en/coins-1533-gold-10-ducats-thorn-mint-this-gold-show-talar-was-struck-from-talar-dies/928082>
- Karolkiewicz 2139: <https://onebid.pl/pl/coins-lithuania-counterstamp-on-naples-1564-ar-talara-60-groszy-a-crowned-sa-monogram-flanked-by-the-date-15-64-counterst/928125>
- Późniejsze potwierdzenie Frankiewicz 97 / Karolkiewicz 2139: <https://onebid.pl/pl/monety-zygmunt-ii-august-talar-sumy-neapolitanskie-1564-ex-frankiewicz-karolkiewicz/1221445>
- Karolkiewicz 2326: <https://onebid.lt/lt/coins-1650-ar-1-2-talara-danzig-mint-superb-crowned-and-armored-bust-casimir-right-lions-support-city-arms-wreath-and-br/928312>
- MNK 127042: <https://zbiory.mnk.pl/pl/katalog/127042>

## Weryfikacja

- Pełny zestaw testów: 589/589 zaliczonych.
- `git diff --check`: bez błędów.
- Oba wyniki benchmarku zapisano w `data/benchmarks/results/`.

## Próby na telefonie po wdrożeniu

1. Moneta kontrmarkowana 1564: APO ma zwrócić kilku kandydatów albo wynik nierozstrzygnięty, nigdy zwykły talar wileński podany pewnie.
2. Półtalar gdański 1650: bez masy ma pozostać ostrożny; po podaniu około 14 g powinien preferować półtalar, nie dwutalar.
3. Dwutalar gdański 1650: po podaniu masy około 57–58 g powinien odróżnić go od półtalara.
4. Dukat warszawski 1831: powtarzalne notowania Spinka nie mogą pojawić się jako trzy osobne typy.
5. Zmiana języka po wyniku nierozstrzygniętym: cała karta i powód wstrzymania mają zmienić język bez zawieszenia.
6. Zapis do albumu po nierozstrzygnięciu: nie może nadpisać poprzedniego rekordu.
7. Eksport XLSX tej samej kolekcji, która wcześniej zawieszała telefon.
