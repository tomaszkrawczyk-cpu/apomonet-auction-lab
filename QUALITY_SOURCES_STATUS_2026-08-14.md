# APOMONET — Quality Sources & Learning status 2026-08-14

## Cel
Zmniejszać błędy identyfikacji przez połączenie otwartej wiedzy, fingerprintów stempli, korekt użytkownika i wzorców eksperckich. Nie budujemy kopii cudzych archiwów.

## Źródła aktywne / przygotowane
- The Met Open Access: CC0/Public Domain per object; fingerprint może powstać wyłącznie dla `isPublicDomain=true`; źródłowy obraz i opis nie są zapisywane.
- Nomisma: otwarta wiedza pojęciowa / numizmatyczna.
- Wikidata: CC0 metadata.
- American Numismatic Society: adapter pojedynczych rekordów działa; dane ODbL, prawa do obrazów oceniane oddzielnie.
- Smithsonian Open Access: adapter przygotowany; automatycznie dopuszcza tylko media z oznaczeniem CC0; wymaga `SMITHSONIAN_API_KEY` na Vercelu.
- Europeana: metadata CC0; `mediaReusable=true` wyłącznie przy otwartym rights statement; wymaga `EUROPEANA_API_KEY`.
- WCN: wyłącznie kontrolowane fakty rynkowe z bezpośrednich kart, maks. 8 URL, bez zdjęć/opisów/list/paginacji.

## Uczenie jakościowe
- `apomonetHardNegativesV1`: zapisuje pary `błędna identyfikacja AI -> zaakceptowana korekta` wraz z liczbą powtórzeń.
- Hard negative może obniżyć ranking znanego błędnego kandydata; nie zmienia samodzielnie danych użytkownika.
- Master fingerprint powstaje dopiero z co najmniej 2 fingerprintów oznaczonych `expertAccepted` dla tej samej tożsamości.
- Master fingerprint wybiera konsensus cech i przechowuje informację, ile wzorców było zgodnych.
- Etap 2 porównuje najpierw master fingerprinty, potem pojedyncze egzemplarze.
- Tylko ekspercko zweryfikowany wzorzec/master może wpływać na confidence. Korekta właściciela pozostaje materiałem uczącym, ale nie udaje opinii eksperta.
- Istotny konflikt ze zweryfikowanym wzorcem ogranicza confidence Etapu 2 i wymusza ostrzeżenie.

## Backup
- Backup v4 obejmuje fingerprinty i `apomonetHardNegativesV1`, aby historia nauki nie ginęła przy zmianie urządzenia.

## Następny wzrost jakości
1. zwiększać liczbę ekspercko potwierdzonych fingerprintów,
2. importować więcej rekordów z otwartych źródeł z jednoznacznymi prawami do mediów,
3. budować master fingerprinty z wielu egzemplarzy,
4. zbierać i analizować najczęstsze hard negatives,
5. po zgodzie Starego Sklepu użyć materiału Sylwestra jako eksperckiej warstwy referencyjnej w zakresie udzielonej zgody.
