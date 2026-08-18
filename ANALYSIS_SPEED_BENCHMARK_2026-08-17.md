# APOMONET — benchmark czasu analizy 2026-08-17

## Metoda

Czas liczony od wysłania przygotowanej pary obrazów do otrzymania pełnej odpowiedzi HTTP. Test produkcyjny wykonano na `https://apomonet-auction-lab.vercel.app/`. Para kontrolna była celowo sztuczną makietą monety: pozwoliła zmierzyć pełne przejście przez model i schemat odpowiedzi bez przypisywania wyniku prawdziwemu obiektowi. Etap 1 prawidłowo odrzucił obrazy jako nienadające się do identyfikacji.

## Wyniki przed przebudową

| Pomiar | Wynik |
|---|---:|
| Etap 1, próba 1 | 27,4 s |
| Etap 1, próba 2 | 26,9 s |
| Etap 1, środek dwóch prób | 27,2 s |
| Etap 2, próba kontrolna | 22,1 s |
| Etap 2, najnowszy zakończony pomiar z logu produkcyjnego | 16,95 s |
| Pełna ścieżka sekwencyjna | ok. 49,3 s |

Wartość 16,95 s pochodzi z jednej zakończonej analizy dwóch małych obrazów. Nie jest średnią i nie zastępuje testu prawdziwej monety na telefonie. Wpływ mają trasa sieciowa, rozmiar zdjęć i obciążenie usługi. Produkcyjne testy na prawdziwych monetach powinny obejmować minimum 20–30 prób i raportować p50 oraz p90.

## Wyniki po przebudowie — produkcja

Serię wykonano tymi samymi dwoma sztucznymi obrazami przez publiczną domenę produkcyjną. Czasy end-to-end obejmują wysłanie obrazów, routing Vercel i odpowiedź. Makieta została prawidłowo odrzucona przez Etap 1 jako niebędąca fotografią monety, ale przeszła przez model, schemat i reguły jakości.

| Etap | Próby end-to-end | p50 | p90 | Backend p50 / p90 |
|---|---|---:|---:|---:|
| Etap 1 | 16,26; 13,84; 15,28 s | **15,28 s** | **16,26 s** | **11,65 / 11,79 s** |
| Etap 2 | 29,80; 28,94; 29,48 s | **29,48 s** | **29,80 s** | **25,58 / 25,76 s** |

W porównaniu z wcześniejszym środkiem 27,2 s kontrolny p50 Etapu 1 spadł o około 44%. Etap 2 jest teraz bogatszy o osobne legendy, cztery cyfry daty z pewnością, mincerza, ocenę stanu, obserwacje autentyczności i pytania rozstrzygające, dlatego jego kontrolny czas wzrósł. Jest to ścieżka uruchamiana dopiero na żądanie.

Etap 1 ma backendowy limit 45 s i kliencki 48 s. Etap 2 ma odpowiednio 55 s i 58 s. Oba etapy zapisują identyfikator zadania; kontrolny retry tego samego Etapu 1 zwrócił zapisany wynik w 3,35 s, z `deduplicated=true` i zerowym ponownym czasem backendu. Jest to ochrona przed typowym ponowieniem po utracie odpowiedzi w ramach aktywnej instancji; do gwarancji między niezależnymi instancjami bez wyjątku potrzebny byłby zewnętrzny trwały magazyn idempotencji.

## Konkurencja

CoinSnap, Coinoscope, Coin ID Scanner i CoinKnow deklarują wynik „w kilka sekund”, zwykle bez liczby. Nieliczne niezależne obserwacje sugerują orientacyjnie 5–15 sekund dla podstawowej identyfikacji, ale nie stanowią jednolitego testu na tym samym telefonie, łączu i zestawie monet.

- CoinSnap: https://readingroom.money.org/mind-the-app-coinsnaps-pros-cons/
- Coinoscope: https://coinoscope.com/
- historyczny pomiar Coinoscope około 15 s: https://www.coincommunity.com/forum/topic.asp?topic_id=361606
- Coin ID Scanner: https://coin-identifier.com/
- CoinKnow: https://play.google.com/store/apps/details?id=com.coinknow.myapp

PCGS CoinFacts/Photograde i aplikacja NGC nie są bezpośrednio porównywalne: odpowiednio wspierają ręczne porównanie lub skan certyfikatu, a nie pełną identyfikację surowej monety ze zdjęcia.

## Interpretacja

Etap 1 APOMONET jest teraz blisko górnej granicy roboczego przedziału prostych identyfikatorów, analizując obie strony, kompletność pól, jakość obrazu i konflikty. Odczyt legend, data cyfra po cyfrze i fingerprint zostały przeniesione do opcjonalnego Etapu 2.

Cel p50 15 s jest praktycznie osiągnięty — kontrolny wynik produkcyjny przekracza go o 0,28 s — ale nie został jeszcze uczciwie potwierdzony na prawdziwych monetach i fizycznym telefonie. Aplikacja zapisuje lokalnie ostatnie 60 udanych pomiarów `basic` i `detail`, liczy p50/p90 i pokazuje czas po zakończeniu analizy. Reprezentatywna seria wymaga minimum 20–30 analiz prawdziwych monet.
