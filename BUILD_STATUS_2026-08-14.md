# APOMONET — status 2026-08-14

## Rdzeń użytkownika — wdrożone
- analiza awers + rewers, kontrola jakości zdjęcia i komunikat 422 dla materiału niewiarygodnego,
- korekta danych z zachowaniem zdjęć, surowego AI, danych właściciela i sesji,
- Etap 2 analizy szczegółowej,
- zapis do kolekcji/albumu, przygotowanie zdjęcia albumowego, PDF/XLSX/share,
- własne albumy, Cele/Marzenia, filtry, przenoszenie i selektywny eksport,
- Kalendarz, przypomnienie .ics, Tryb eksperta, kalkulator aukcyjny PRO,
- backup/restore v4.

## Rynek i wycena — wdrożone
- własny model faktów rynkowych zamiast kopiowania archiwów,
- hammerPrice / realizedPrice / totalPrice rozdzielone,
- podobieństwo po władcy, nominale, roku, mennicy, odmianie, metalu i stanie,
- klasy strict / good / indicative / weak,
- widełki 10–90 percentyl + mediana; brak wyceny przy słabym materiale,
- WCN: kontrolowany import bezpośrednich kart, batch do 8 URL, bez list/paginacji, opisów i zdjęć, z deduplikacją i provenance.

## Open Data / Multi-source — wdrożone
- wspólny rdzeń źródeł z source/sourceId/sourceUrl/license/rightsCheckedAt,
- Nomisma — GREEN / CC BY,
- Wikidata — GREEN / CC0,
- The Met Open Access — GREEN wyłącznie isPublicDomain=true,
- American Numismatic Society — GREEN / dane ODbL; rekord produkcyjny 1989.91.2 przetestowany,
- Smithsonian Open Access — GREEN wyłącznie CC0; adapter produkcyjny aktywny, ale SMITHSONIAN_API_KEY obecnie nie skonfigurowany,
- Europeana — metadata CC0, media osobno kwalifikowane przez rights statement; adapter produkcyjny aktywny, ale EUROPEANA_API_KEY obecnie nie skonfigurowany,
- WCN — YELLOW_DIRECT_RECORD_BATCH dla faktów rynkowych,
- Stary Sklep — GREEN_AFTER_PERMISSION jako przyszłe źródło eksperckie,
- NumisBids / Coinstrail pozostają RED dla automatycznego ingestu bez odpowiednich praw.

## Fingerprint / biometria — wdrożone
- Etap 2 zwraca ustrukturyzowane cechy: interpunkcja, data, legenda, litery/cyfry, portret, korona, herb/tarcza, znak menniczy, ogon orła, skrzydła, pióra, monogram, rant,
- każda cecha ma value/confidence/method/note; niewidoczne cechy mają confidence=0,
- silnik ważonego porównania fingerprintów,
- ownerAccepted i expertAccepted rozdzielone,
- tylko expertVerified może tworzyć wzorzec wysokiej pewności,
- fingerprint-open-source z The Met Public Domain: zapisuje cechy + provenance, nie zapisuje źródłowego zdjęcia ani opisu,
- stage2-fingerprint-match aktywny na produkcji,
- ekspercki konflikt fingerprintu może ograniczyć confidence Etapu 2 i dodać ostrzeżenie,
- panel Fingerprint pokazuje najbliższe wzorce i konflikty.

## Quality learning — wdrożone
- hard-negative learning: zaakceptowana korekta może zapisać błędna identyfikacja → poprawna identyfikacja,
- powtarzające się błędy zwiększają karę dla danego błędnego kandydata,
- master fingerprint powstaje z co najmniej 2 wzorców expertAccepted tej samej tożsamości,
- master fingerprint używa konsensusu cech zamiast pojedynczego egzemplarza,
- Etap 2 preferuje master fingerprints przed pojedynczymi wzorcami,
- panel Fingerprint pokazuje: liczbę fingerprintów, wzorców eksperckich, master fingerprintów i zapamiętanych pomyłek AI oraz listę najczęstszych hard negatives,
- backup v4 obejmuje apomonetHardNegativesV1, więc historia korekt jakościowych jest zachowywana.

## Produkcja Vercel — smoke test 2026-08-14
- app.js ładuje quality-learning-core.js oraz stage2-fingerprint-match.js,
- /api/ans-open-data?health=1 — HTTP 200,
- /api/ans-open-data?id=1989.91.2 — HTTP 200,
- /api/smithsonian-open-access?health=1 — HTTP 200, keyConfigured=false,
- /api/europeana?health=1 — HTTP 200, configured=false, mediaRequiresOpenRights=true,
- /api/fingerprint-open-source?health=1 — HTTP 200,
- open-data.html — HTTP 200 i pokazuje Nomisma/ANS/Wikidata/Europeana/Met/Smithsonian,
- backup.html — HTTP 200, APOMONET_BACKUP v4,
- fingerprints.html — HTTP 200 i ma diagnostykę hard negatives/master fingerprints,
- brak grup błędów runtime aplikacji; jedyny wpis to Node DEP0169 url.parse() deprecation warning.

## Czeka na test fizycznego telefonu
- aparat vs galeria w pickerze Androida,
- słabe zdjęcie → UX komunikatu 422,
- pełna ścieżka analiza → korekta → Etap 2 → fingerprint → album → PDF/XLSX,
- przygotowanie zdjęcia / usuwanie tła,
- XLSX na Androidzie,
- WhatsApp/Messenger/e-mail share,
- backup v4 download/restore,
- .ics do kalendarza,
- własny album i trwałość po restarcie,
- Tryb eksperta → promocja fingerprintu → powstanie master fingerprintu po drugim zgodnym wzorcu.

## Najważniejsza dalsza praca
1. Napełnić zweryfikowaną bazę polskich monet od średniowiecza do współczesności.
2. Napełnić fingerprinty materiałem Open Access i ekspertami.
3. Uzyskać SMITHSONIAN_API_KEY i EUROPEANA_API_KEY, jeśli chcemy aktywnego importu tych źródeł.
4. Budować rzeczywiste master fingerprinty i obserwować hard-negative errors.
5. Dalej zasilać fakty aukcyjne i wycenę.
6. Po stabilizacji: prawdziwy feed lotów aukcyjnych, profile kosztów domów aukcyjnych, Standard/PRO, synchronizacja urządzeń, finalny design i aplikacje mobilne/desktop.
