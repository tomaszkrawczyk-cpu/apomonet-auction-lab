# APOMONET — status 2026-08-14

## Rdzeń użytkownika — wdrożone
- analiza awers + rewers, kontrola jakości zdjęcia i komunikat 422 dla materiału niewiarygodnego,
- korekta danych z zachowaniem zdjęć, surowego AI, danych właściciela i sesji,
- Etap 2 analizy szczegółowej,
- zapis do kolekcji/albumu, przygotowanie zdjęcia albumowego, PDF/XLSX/share,
- własne albumy, Cele/Marzenia, filtry, przenoszenie i selektywny eksport,
- Kalendarz, przypomnienie .ics, Tryb eksperta, kalkulator aukcyjny PRO,
- backup/restore v4.

## Analiza i kontrola jakości — wdrożone
- data odczytywana cyfra po cyfrze; brak pewności nie jest uzupełniany z historii,
- kontrola konfliktu rok–władca i ostrożne traktowanie rodziny talar/półtalar/dwutalar,
- poprawiona normalizacja polskich znaków (`ł` m.in. w Władysław/Stanisław/złoty),
- po Etapie 1 cicha kontrola referencyjna w Smithsonian oraz American Numismatic Society,
- zgodne źródło może wyłącznie wesprzeć wynik; nie podnosi automatycznie confidence,
- konflikt referencyjny nie nadpisuje identyfikacji: ogranicza confidence do maks. 72%, dodaje ostrzeżenie i wstrzymuje wycenę,
- brak rekordu referencyjnego jest wynikiem neutralnym.

## Rynek i wycena — wdrożone
- własny model faktów rynkowych zamiast kopiowania archiwów,
- hammerPrice / realizedPrice / totalPrice rozdzielone,
- podobieństwo po władcy, nominale, roku, mennicy, odmianie, metalu i stanie,
- klasy strict / good / indicative / weak,
- widełki 10–90 percentyl + mediana; brak wyceny przy słabym materiale,
- WCN: kontrolowany import bezpośrednich kart, batch do 8 URL, bez list/paginacji, opisów i zdjęć, z deduplikacją i provenance.

## Open Data / Multi-source — wdrożone
- Nomisma — GREEN / CC BY,
- Wikidata — GREEN / CC0,
- The Met Open Access — GREEN wyłącznie `isPublicDomain=true`,
- American Numismatic Society — GREEN / ODbL: pojedynczy rekord, wyszukiwanie metadata oraz kontrola referencyjna w jednym endpointcie; bez automatycznego przechowywania obrazów,
- Smithsonian Open Access — GREEN wyłącznie CC0: `SMITHSONIAN_API_KEY` skonfigurowany i aktywny; filtrowane są rzeczywiste obiekty NMAH, katalogi/książki odrzucane,
- Europeana — metadata CC0, media osobno kwalifikowane przez rights statement; `EUROPEANA_API_KEY` oczekuje na konfigurację,
- WCN — YELLOW_DIRECT_RECORD_BATCH dla faktów rynkowych,
- Stary Sklep — GREEN_AFTER_PERMISSION jako przyszłe źródło eksperckie,
- NumisBids / Coinstrail pozostają RED dla automatycznego ingestu bez odpowiednich praw.

## Fingerprint / quality learning — wdrożone
- ustrukturyzowane cechy Etapu 2: interpunkcja, data, legenda, litery/cyfry, portret, korona, herb/tarcza, znak menniczy, ogon orła, skrzydła, pióra, monogram, rant,
- ownerAccepted i expertAccepted rozdzielone,
- master fingerprint z co najmniej 2 wzorców eksperckich tej samej tożsamości,
- hard-negative learning zapamiętuje `błędna identyfikacja AI -> zaakceptowana korekta`,
- Etap 2 preferuje master fingerprints; tylko zweryfikowane wzorce mogą wpływać na confidence,
- backup v4 zachowuje fingerprinty i hard negatives.

## Produkcja Vercel — smoke test 2026-08-14
- `/api/health` — HTTP 200: OpenAI=true, Smithsonian=true, Europeana=false,
- Smithsonian wyszukiwanie działa na produkcji; przykładowe polskie rekordy: 2 dukaty Augusta II 1702, talar Stanisława Augusta 1766,
- Smithsonian validator: poprawny talar 1766 Stanisława Augusta => `supported`; celowo błędny władca => `possible_conflict`,
- ANS wyszukiwanie `Poland 1593` zwraca realne trojaki Zygmunta III, dukata i egzemplarze z kilku mennic,
- ANS funkcje zostały skonsolidowane do jednego endpointu, aby zmieścić się w limicie 12 Serverless Functions planu Hobby,
- deployment po konsolidacji ponownie READY,
- brak krytycznych grup błędów runtime; pozostaje nieblokujące ostrzeżenie Node DEP0169 `url.parse()` z warstwy runtime/dependency.

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
- Tryb eksperta → promocja fingerprintu → master fingerprint po drugim zgodnym wzorcu.

## Rzeczywiste blokery dalszego etapu
1. `EUROPEANA_API_KEY` — oczekuje na wiadomość od Europeany.
2. Materiał ekspercki Starego Sklepu — wymaga zgody właściciela.
3. Testy zachowania Androida — wymagają fizycznego telefonu użytkownika.
4. Rozbudowa zweryfikowanej bazy i master fingerprintów wymaga kolejnych realnych, prawidłowo opisanych monet/wzorców.
