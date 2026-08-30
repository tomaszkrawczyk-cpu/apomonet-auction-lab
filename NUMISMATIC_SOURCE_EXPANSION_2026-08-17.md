# Rozszerzenie źródeł APOMONET — 2026-08-17

## Wdrożony katalog — aktualizacja 2026-08-28

- aktywne lokalne rekordy rozpoznawcze: **22 145** po usunięciu duplikatów źródłowych;
- katalog MNK: **5810** public-domain egzemplarzy reprezentujących **2168** typów, w tym **5713** egzemplarzy z co najmniej dwoma zdjęciami;
- dedykowany katalog PRL: **257** rekordów rocznikowo-materiałowych z **92** typów (1949–1989), w tym **244** z odsyłaczem do aktu urzędowego i **15** ze zdjęciem na otwartej licencji sprawdzonej na poziomie pliku;
- NBP/ELI: **83** współczesne typy — pełne 26 typów z 2023 r., 23 typy z 2024 r., 23 typy z 2025 r. oraz 11 typów wydanych w 2026 r.; rejestr sprawdzony do 29 sierpnia, a zapowiedziana na 1 września moneta Haliny Konopackiej pozostaje poza aktywnym katalogiem do dnia emisji; wszystkie pozycje potwierdzone aktami emisyjnymi, wyłącznie fakty, bez kopiowania zdjęć i opisów;
- otwarty katalog III RP 1995–2024: **896** dodatkowych rekordów z wersjonowanych tabel CC BY-SA — **260** okolicznościowych 2 zł, **16** historycznych 5 zł z serii „Odkryj Polskę”, **96** rocznikowo-nominałowych monet bulionowych „Orzeł Bielik/Bielik” i **524** monety kolekcjonerskie; każdy rekord ma masę, wymiar, nakład i provenance, bez kopiowania zdjęć, opisów ani numerów z chronionych katalogów;
- monety próbne: **502** rekordy otwartego katalogu prób z lat 1949–1994; ewentualne próby po 1994 r. pozostają osobnym zakresem i nie są tworzone przez domysł z aktów dotyczących monet wprowadzonych do obiegu;
- okresy: średniowiecze piastowskie, Jagiellonowie, monarchia elekcyjna, zabory i powstania, II RP i wojna, PRL oraz III RP;
- odrzucone automatycznie: medale, żetony, banknoty, kopie, repliki i obiekty jawnie opisane jako fałszywe;
- pierwszy odczyt zdjęć działa bez listy przypadkowych rekordów lokalnych; dopiero potem uruchamia się ranking po całym katalogu oraz osobne porównanie zdjęć z maksymalnie trzema parami referencyjnymi;
- sprzeczny odczyt władcy jest twardą blokadą identyfikacji, a brak rozstrzygnięcia kończy się wynikiem `Nie ustalono`.

Powtarzalne importery znajdują się w `scripts/build-mnk-polish-catalog.mjs`, `scripts/build-prl-open-catalog.mjs`, `scripts/build-polish-pattern-open-catalog.mjs`, `scripts/build-third-republic-open-catalog.mjs` i `scripts/build-nbp-eli-current-catalog.mjs`; skompresowane wyniki w `data/recognition/mnk-polish-catalog-v1.json.gz`, `data/recognition/prl-open-catalog-v1.json.gz`, `data/recognition/polish-pattern-open-catalog-v1.json.gz` i `data/recognition/third-republic-open-catalog-v1.json.gz`, współczesne fakty w `data/recognition/nbp-eli-current-catalog-v1.json` i `data/recognition/nbp-official-catalog-v1.json`, a jawny rejestr przeglądanych źródeł w `data/recognition/research-source-manifest-v1.json`.

## Zasada produktowa

APOMONET korzysta z szerokiego spektrum publicznej wiedzy, ale rozróżnia jej moc dowodową:

1. `VERIFIED` — dozwolone, niezależnie potwierdzone fakty albo weryfikacja eksperta.
2. `RUNTIME_REFERENCE` — bieżące porównanie z API bez budowania kopii cudzej bazy.
3. `COMMUNITY_CANDIDATE` — hipotezy, alternatywy i testy do wykonania; bez zmiany confidence i bez wyceny.
4. `REFERENCE_ONLY` — bibliografia lub link, bez przejmowania treści.

## Mapa źródeł

| Źródło | Tryb | Co wykorzystujemy |
|---|---|---|
| Portal Numizmatyczny | COMMUNITY_CANDIDATE | Własne podsumowania cech stempla, możliwych odmian i kontroli autentyczności |
| TPZN, monetyforum.pl | COMMUNITY_CANDIDATE | Tropy identyfikacyjne, znane pomyłki, falsyfikaty, testy i prośby o dodatkowe zdjęcia |
| Blog Numizmatyczny | COMMUNITY_CANDIDATE | Metodyka klasyfikowania odmian i hierarchia cech |
| PTN Olsztyn | MANUAL_REFERENCE | Pojedyncze fakty i porównania z provenance |
| Numista API | RUNTIME_REFERENCE | Maksymalnie 5 kandydatów N#, tytuł i emitent; atrybucja „Source: Numista”; bez zdjęć i trwałego magazynowania metadanych |
| POLONA | VERIFIED_ITEM_LEVEL | Fakty z obiektów public-domain/open po zapisaniu praw konkretnego obiektu |
| NBP | OFFICIAL_FACTS | Parametry emisji zapisane własnymi polami; bez importu materiałów graficznych |
| Korpus PRL APOMONET | VERIFIED_ITEM_LEVEL | Fakty z wersjonowanych stron CC BY-SA, akty prawne ELI/ISAP i wyłącznie zdjęcia Commons z prawami sprawdzonymi na poziomie pliku |
| ANS / Nomisma / Wikidata / Smithsonian / Met | OPEN_DATA | Znormalizowane fakty zgodnie z licencją i provenance |
| IKMK | IDS_ONLY | Public-domain identifiers jako odsyłacze; bez tekstów objętych licencją NC |
| Zeno.ru | ITEM_REVIEW | Tylko konkretny rekord z jednoznaczną licencją komercyjną |
| Katalog Fischer | REFERENCE_ONLY | Bibliografia/numer; bez kopiowania katalogu |
| NumisBids, Coinstrail, Niemczyk, Allegro | RED_AUTOMATION | Brak automatyzacji bez zgody; pojedyncze linkowanie i ręczna kontrola oddzielnie |

## Pierwszy pakiet tropów diagnostycznych — 17 rekordów

- szóstaki Zygmunta III Wazy 1623–1627: pięć grup cech korony rewersu;
- 1 zł 2019: test magnesem i odróżnienie pozornego dublowania od błędu bicia;
- próba 20 zł 1924 z monogramem RP: pomiar masy/metalu i analiza pęknięć stempla;
- 10 groszy 1973 bez znaku mennicy: wysokie ryzyko ingerencji, makro i ekspertyza przed wyceną;
- 1 zł 1929 bez Kościeszy: alternatywa rzadkiej odmiany i usunięcia/zaniku detalu;
- hierarchia katalogowa: typ, rocznik i duże zmiany przed interpunkcją i mikroróżnicami.
- 5 zł 1994: położenie ręcznie nabijanego znaku mennicy nie rozstrzyga samo o odmianie ani falsyfikacie;
- trojak lubelski 1595: kontrola manipulacji cyfry 5 i zgodności stempla z rocznikiem 1596;
- szelągi ryskie 1608/1612, 1609 z lilią i domniemany 1622: konflikty odczytu, falsyfikat z epoki i kontrola chronologii;
- szeląg litewski Jana Kazimierza: datowanie pomocnicze według herbu podskarbiego;
- orty okupacyjne Karola X Gustawa: Toruń/Elbląg, legenda, nakrycie głowy i ikonografia rewersu;
- 2 zł 1924 H Birmingham: kontrola całego stempla, w tym szyi, ogona i łap orła;
- 5 zł Konstytucja 1925 i 100 zł Kopernik 1925: pomiary, metal, rant i cechy odmian próbnych;
- 1 zł 1977: rozdzielenie regularnej odmiany półperełek od zużycia lub uszkodzenia stempla.

Warstwa obejmuje obecnie 16 konkretnych tożsamości/rodzin oraz jedną regułę ogólną. Test 140 kombinacji rok × nominał zakończył się zerem fałszywych dopasowań. Pokrycie pozostaje nierówne: 7 rekordów królewskich, 5 z II RP, po 2 z PRL i współczesnych oraz brak materiału średniowiecznego i zaborowego.

## Warunki promocji

Trop społecznościowy może zostać przepisany do Knowledge Builder dopiero po niezależnym potwierdzeniu dozwolonym źródłem albo przez eksperta. Samo wielokrotne powtórzenie tej samej informacji na forach nie jest niezależnym potwierdzeniem.
