# APOMONET — wycena z publicznych faktów aukcyjnych

## Zasada
APOMONET nie kopiuje opisów katalogowych ani fotografii do modułu wyceny. Przechowuje własne, znormalizowane fakty rynkowe: dom aukcyjny/źródło, data sprzedaży, cena młotkowa, opcjonalna cena z opłatami, waluta, identyfikacja monety oraz link/provenance.

## Dopasowanie porównywalnych monet
Twarde konflikty władcy lub nominału odrzucają rekord. Punktowane są: władca, nominał, rok, mennica, odmiana, metal i stan. Rekordy klasyfikowane są jako strict / good / indicative / weak. Do statystyk trafiają wyłącznie rekordy od poziomu indicative, a wycena jest pokazywana dopiero przy wystarczającej liczbie dobrze dopasowanych rekordów.

## Statystyki
Domyślny okres: 10 lat. Pokazujemy liczbę porównywalnych notowań, liczbę ścisłych dopasowań, medianę i odporny na skrajności zakres 10.–90. percentyla. Nie używamy pojedynczego minimum i maksimum jako automatycznej wyceny.

## Komunikacja użytkownikowi
APOMONET pokazuje zakres rynku, a nie jedną pewną wartość. Przy zbyt małej lub słabo dopasowanej próbie wycena zostaje wstrzymana i użytkownik widzi powód. Źródła notowań można rozwinąć i skontrolować.

## Status 2026-08-14
Silnik v2, migracja rekordów v1, scoring podobieństwa, statystyki, ekran Archiwum/Wycena, zapis wyceny do rekordu monety oraz UI po analizie są wdrożone w repo. Brakuje jeszcze legalnych automatycznych feedów/importów dla dużej liczby rzeczywistych wyników i przeliczeń wielu walut do wspólnej waluty historycznym kursem z dnia sprzedaży.
