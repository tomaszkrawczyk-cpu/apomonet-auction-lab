# ApoMonet — test wizualny różnych egzemplarzy (500 typów)

Data: 2026-09-10

## Zakres

- Typy w manifeście: 500
- Typy użyte po pobraniu i kontroli separacji: 490
- Pobrane obrazy: 1960 / 1988
- Zapytanie i referencja pochodzą z różnych rekordów muzealnych.
- Zdjęcia były przetwarzane tymczasowo i nie są częścią raportu ani artefaktu.

## Strategie wizualne

| Strategia | Top-1 | Top-5 | Pewny poprawny wynik | Pewny błąd | p50 rankingu |
|---|---:|---:|---:|---:|---:|
| phash | 2.0% | 6.7% | 0.0% | 0.0% | 6.04 ms |
| hog | 27.6% | 49.0% | 2.3% | 2.3% | 10.98 ms |
| resnet18 | 27.1% | 52.4% | 4.3% | 1.3% | 6.21 ms |
| global_fusion | 29.8% | 54.1% | 1.5% | 1.0% | 23.27 ms |
| sift_rerank | 30.6% | 54.9% | 7.1% | 3.8% | 35.42 ms |

## Hybryda obrazu i metadanych

| Scenariusz | Twarde filtry Top-1 | Miękka hybryda Top-1 | Hybryda okresowa Top-1 |
|---|---:|---:|---:|
| clean | 72.7% | 47.6% | 47.6% |
| wrong-nominal | 0.0% | 46.7% | 47.3% |
| wrong-mint | 4.1% | 48.2% | 47.3% |
| wrong-year | 0.0% | 39.2% | 40.4% |

## Werdykt automatyczny

Najlepszy czysty shortlist wizualny: sift_rerank (Top-1 30.6%, Top-5 54.9%). Miękka hybryda osiągnęła Top-1 47.6% i Top-5 71.2%. Twarde filtry należy odrzucić, jeżeli pod zakłóceniem roku, nominału lub mennicy tracą prawidłowego kandydata.

Pełne dane maszynowe, wyniki według okresów i przykłady pomyłek znajdują się w pliku JSON wygenerowanym razem z raportem.
