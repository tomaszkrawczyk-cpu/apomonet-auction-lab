# APOMONET — status 2026-08-14

## Domknięte / wdrożone
- backendowy bezpiecznik słabego zdjęcia: API zwraca 422 zamiast pewnego wyniku, jeśli zdjęcia nie nadają się do wiarygodnej analizy,
- wybór aparat / galeria z kafelków analizy,
- kontrola katalogowa po analizie jest ładowana globalnie,
- Metal jest natywnym polem korekty; korekta zachowuje zdjęcia, pierwotny wynik AI, widełki wyceny i informacje właściciela,
- powrót po korekcie oraz automatyczne otwarcie wyboru albumu po wybraniu „Dodaj do albumu”,
- pytania dodatkowe, widełki wartości i przekazanie odpowiedzi właściciela do etapu szczegółowego,
- Stary Sklep — Sylwester Kopyciński w domach aukcyjnych i natywnie w ulubionych Kalendarza,
- Kalendarz generuje przypomnienie .ics z alarmem 2 dni wcześniej,
- Kolekcja realnych monet: filtry władca / nominał / mennica / metal, zaznaczanie, PDF, XLSX, udostępnianie i wyraźne usunięcie z całej kolekcji,
- własne albumy użytkownika są otwieralne i pokazują realne monety; mają filtry, zaznaczanie, eksport, „Usuń tylko z albumu” oraz przenoszenie do innego albumu,
- domyślne realne albumy: Mój album / Moje cele / Marzenia,
- album „Moje cele” zasila silnik alertów aukcyjnych,
- natywny XLSX na stronie eksportu,
- Kalkulator aukcyjny PRO: buyer premium, VAT od prowizji, transport, ubezpieczenie, cło, VAT importowy, inne koszty, FX oraz wynik sprzedającego,
- Tryb eksperta z seryjną weryfikacją, notatką, profilami prywatności eksportu i promocją istniejącego fingerprintu do wzorca eksperckiego,
- Katalog, Archiwum/Wycena, Wartość/ROI, Centrum Narzędzi PRO,
- lokalny Backup/Restore v3 obejmuje kolekcję, albumy, ustawienia, wiedzę, fakty aukcyjne, multi-source knowledge i fingerprinty monet,
- rozszerzony ekran diagnostyczny health.html.

## Rynek i wycena
- własny model faktów rynkowych zamiast kopiowania cudzych archiwów,
- rozdzielenie hammerPrice / realizedPrice / totalPrice,
- porównywanie po władcy, nominale, roku, mennicy, odmianie, metalu i stanie,
- klasy strict / good / indicative / weak,
- widełki 10–90 percentyl + mediana zamiast surowego minimum/maksimum,
- brak wyceny, jeśli materiał jest zbyt słaby,
- WCN: kontrolowany import publicznych faktów z bezpośrednich kart; batch maks. 8 URL, bez list/paginacji, bez zapisu zdjęć i opisów, z deduplikacją i provenance.

## Multi-source Knowledge
- wspólny rdzeń łączenia dowodów z wielu źródeł,
- zachowanie source / sourceId / sourceUrl / licencji / rightsCheckedAt,
- źródła RED blokowane przed automatycznym ingestem,
- otwarte adaptery: Nomisma, Wikidata, The Met Open Access,
- The Met: automatyczny ingest tylko dla obiektów isPublicDomain=true i przechodzących filtr numizmatyczny,
- konsensus źródeł: single-source / supported / strong,
- Stary Sklep przygotowany jako przyszłe źródło eksperckie po zgodzie,
- NumisBids i Coinstrail pozostają zablokowane dla automatycznego ingestu bez odpowiednich praw/zgody,
- Niemczyk pozostaje bez automatycznego adaptera do czasu zgody/zweryfikowania warunków.

## Fingerprint / biometria monety
- Etap 2 zwraca ustrukturyzowane cechy diagnostyczne zamiast samego tekstu,
- cechy obejmują m.in. interpunkcję, rozstaw/pozycję daty, pozycje legendy, formy liter i cyfr, portret, koronę, tarczę/herb, znak menniczy, ogon orła, skrzydła, pióra, monogram i rant,
- każda cecha ma wartość, confidence, metodę i notatkę; cechy niewidoczne mają confidence=0 zamiast zgadywania,
- silnik porównania fingerprintów liczy podobieństwo ważone i pokazuje liczbę wspólnych cech oraz konflikty,
- rozdzielone statusy ownerAccepted i expertAccepted; korekta właściciela nie udaje weryfikacji eksperckiej,
- biblioteka wzorców eksperckich budowana tylko z expertVerified,
- panel fingerprints.html pokazuje fingerprinty, wzorce i najbliższe dopasowania,
- endpoint fingerprint-open-source potrafi zbudować fingerprint z obiektu The Met Public Domain i zwraca tylko cechy + provenance; nie zapisuje źródłowego zdjęcia ani opisu,
- panel Fingerprint ma przepływ Met object ID → budowa fingerprintu → zapis lokalny,
- stage2-fingerprint-match.js przygotowany do pokazania dopasowań fingerprintu bezpośrednio po Etapie 2.

## Produkcja Vercel
- Etap 2 z fingerprintem, rdzeń fingerprintów i dashboard fingerprintów mają deployment READY,
- Git→Vercel wznowił działanie po krótkim zatorze, ale produkcyjny app.js w ostatnim sprawdzeniu nie ładował jeszcze stage2-fingerprint-match.js,
- ostatnie commity: loader dopasowań, ulepszony Tryb eksperta, backup v3, endpoint fingerprint-open-source i UI importu The Met są w GitHubie; wymagają potwierdzenia na produkcyjnej domenie przed oznaczeniem jako wdrożone.

## Czeka na test fizycznego telefonu
- aparat vs galeria w systemowym pickerze Androida,
- odrzucenie naprawdę słabego zdjęcia i czytelność komunikatu 422,
- pełna ścieżka analiza → korekta → Etap 2 → fingerprint → zapis → album → PDF/XLSX,
- pytanie o przygotowanie zdjęcia / usunięcie tła przed zapisem,
- faktyczne pobranie i otwarcie XLSX na Androidzie,
- systemowe udostępnianie do WhatsApp/Messenger/e-mail,
- pobranie/przywrócenie backupu v3 na Androidzie,
- import przypomnienia .ics do kalendarza telefonu,
- + Nowy album, otwieranie własnego albumu i trwałość po restarcie przeglądarki,
- Tryb eksperta: weryfikacja monety z fingerprintem i potwierdzenie promocji wzorca.

## Nadal do dalszej budowy
- napełnienie zweryfikowanej bazy polskich monet od średniowiecza do współczesności,
- napełnienie biblioteki fingerprintów wzorcami Open Access i później materiałem eksperckim Starego Sklepu po zgodzie,
- dalsze zasilanie publicznymi faktami aukcyjnymi i wzmacnianie wyceny,
- pełne podpięcie fingerprintu jako dowodu do finalnej identyfikacji, tak aby konflikt cech mógł obniżać confidence zamiast być tylko informacją,
- legalny feed prawdziwych przyszłych lotów aukcyjnych; dopiero wtedy aktywne dopasowanie Celów/Marzeń do konkretnych lotów,
- profile kosztów konkretnych domów aukcyjnych po zweryfikowaniu regulaminów,
- dokończenie audytu dynamicznych tekstów PL/EN/DE/FR,
- synchronizacja między urządzeniami / konto i ewentualny PIN/biometria dostępu — późniejszy etap wymagający odrębnej architektury prywatności,
- rozbudowa demo monet i finalna szata graficzna dopiero po stabilizacji,
- Standard/PRO i docelowe aplikacje mobilne/desktop.
