# APOMONET — Quality Sources & Learning status 2026-08-14

## Cel
Zmniejszać błędy identyfikacji przez połączenie otwartej wiedzy, fingerprintów stempli, korekt użytkownika i wzorców eksperckich. Nie budujemy kopii cudzych archiwów.

## Źródła aktywne
- The Met Open Access: CC0/Public Domain per object; fingerprint wyłącznie dla `isPublicDomain=true`; źródłowy obraz i opis nie są zapisywane.
- Nomisma: otwarta wiedza pojęciowa / numizmatyczna.
- Wikidata: CC0 metadata.
- American Numismatic Society: aktywny endpoint ODbL obsługuje pojedyncze rekordy, wyszukiwanie metadata i kontrolę referencyjną po analizie. Obrazy nie są automatycznie przechowywane.
- Smithsonian Open Access: `SMITHSONIAN_API_KEY` aktywny; adapter ograniczony do rzeczywistych obiektów numizmatycznych NMAH, katalogi/książki odrzucane, media tylko przy potwierdzonym CC0.
- Europeana: metadata CC0; `mediaReusable=true` wyłącznie przy otwartym rights statement; oczekujemy na `EUROPEANA_API_KEY`.
- WCN: wyłącznie kontrolowane fakty rynkowe z bezpośrednich kart, maks. 8 URL, bez zdjęć/opisów/list/paginacji.

## Kontrola wieloźródłowa Etapu 1
- Smithsonian i ANS są sprawdzane jako niezależne źródła referencyjne po podstawowej analizie.
- Zgodny rekord nie podnosi automatycznie confidence i nie udaje certyfikatu odmiany.
- Brak rekordu jest neutralny.
- Możliwy konflikt przy zgodnym roku/nominale i niezgodnym władcy: confidence maks. 72%, ostrzeżenie i wstrzymanie wyceny; dane nie są nadpisywane automatycznie.
- Normalizacja obsługuje polskie `ł`, transliteracje nazw władców oraz odpowiedniki talar/taler/thaler, dukat/ducat itd.

## Uczenie jakościowe
- `apomonetHardNegativesV1`: zapisuje pary `błędna identyfikacja AI -> zaakceptowana korekta` wraz z liczbą powtórzeń.
- Hard negative wpływa na ranking, ale nie zmienia samodzielnie danych użytkownika.
- Master fingerprint powstaje z co najmniej 2 fingerprintów `expertAccepted` tej samej tożsamości.
- Etap 2 porównuje najpierw master fingerprinty, potem pojedyncze egzemplarze.
- Tylko ekspercko zweryfikowany wzorzec/master może wpływać na confidence.
- Backup v4 zachowuje fingerprinty i hard negatives.

## Zweryfikowane przykłady produkcyjne
- Smithsonian: `1 Taler, Stanislaus August Poniatowski, Poland, 1766` wspiera poprawną identyfikację; celowo podany Zygmunt III przy roku 1766 daje `possible_conflict`.
- Smithsonian: `2 Ducats, Augustus II, Poland, 1702` poprawnie wspiera identyfikację Augusta II.
- ANS: zapytanie `Poland 1593` zwraca m.in. kilka 3 groschen Zygmunta III Wazy (różne mennice) i dukata 1593.

## Technika
- Funkcje ANS zostały skonsolidowane do jednego endpointu, aby pozostać poniżej limitu 12 funkcji serverless na planie Vercel Hobby.
- Produkcja po konsolidacji jest READY.

## Następny wzrost jakości
1. dodać Europeanę po otrzymaniu klucza,
2. zwiększać liczbę ekspercko potwierdzonych fingerprintów,
3. budować master fingerprinty z wielu egzemplarzy,
4. obserwować najczęstsze hard negatives,
5. po zgodzie Starego Sklepu dołączyć materiał Sylwestra jako ekspercką warstwę referencyjną.
