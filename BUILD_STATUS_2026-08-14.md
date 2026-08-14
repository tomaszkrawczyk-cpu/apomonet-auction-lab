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
- Tryb eksperta z seryjną weryfikacją, notatką i profilami prywatności eksportu,
- Katalog, Archiwum/Wycena, Wartość/ROI, Centrum Narzędzi PRO,
- silniki Cele/Marzenia ↔ aukcje i akcje dodawania lotu do kolekcji/celów są ładowane globalnie,
- lokalny Backup/Restore kolekcji, albumów, ustawień i wiedzy,
- rozszerzony ekran diagnostyczny health.html.

## Knowledge Builder — legalna wiedza
- warstwa obserwacji faktograficznych + provenance,
- konsensus między źródłami,
- audyt sprzeczności,
- osobna warstwa Verified Knowledge: promocja tylko przy ≥2 niezależnych źródłach albo potwierdzeniu eksperta,
- Verified Knowledge jest automatycznie rejestrowane jako typy katalogowe APOMONET,
- twarda biała lista źródeł z blokadą źródeł bez jednoznacznego prawa,
- źródła otwarte: Nomisma (CC-BY), Wikidata (CC0), Europeana metadata CC0 z obowiązkowym filtrem praw obiektu,
- dodatkowy kontrolowany importer otwartych pojęć Nomisma / Wikidata: tylko etykieta, typ, identyfikator, licencja i provenance,
- archiwa WCN/OneBid pozostają wyłącznie referencyjne do czasu jasnej zgody/licencji; Niemczyk/NumisBids/Coinstrail/Allegro są zablokowane dla warstwy uczącej bez zgody,
- stare próbki aukcyjne zostały wyłączone z warstwy uczącej,
- brak automatycznego scrapingu źródeł bez wyraźnego prawa/zgody,
- datowany audyt compliance i wzory próśb o zgodę są zapisane w repo,
- język/selekcja globalna podpięta także do ekranów LAB; rozszerzono słownik nowych funkcji.

## Smoke test produkcji wykonany bez udziału telefonu
- najnowsze deploymenty Vercel: READY,
- collection.html: HTTP 200,
- export.html: HTTP 200,
- user-album.html: HTTP 200,
- calendar.html: HTTP 200,
- backup.html: HTTP 200,
- brak logów error/fatal w ostatnim sprawdzeniu produkcji.

## Czeka na test fizycznego telefonu
- aparat vs galeria w systemowym pickerze Androida,
- odrzucenie naprawdę słabego zdjęcia i czytelność komunikatu 422,
- faktyczne pobranie i otwarcie XLSX na Androidzie,
- systemowe udostępnianie do WhatsApp/Messenger/e-mail,
- pobranie/przywrócenie backupu na Androidzie,
- import przypomnienia .ics do kalendarza telefonu,
- + Nowy album, otwieranie własnego albumu i trwałość po restarcie przeglądarki,
- pełna ścieżka analiza → pytania → korekta → detal → zapis → album → eksport.

## Nadal do dalszej budowy
- dokończenie pełnego audytu wszystkich dynamicznych tekstów PL/EN/DE/FR,
- dalsza integracja legalnych otwartych źródeł wiedzy oraz adapter Europeany z filtrem praw na rekordzie,
- dalsza rozbudowa zweryfikowanej bazy polskich monet od średniowiecza do współczesności,
- legalny feed prawdziwych przyszłych lotów aukcyjnych; dopiero wtedy aktywne dopasowanie Celów/Marzeń do konkretnych lotów,
- profile kosztów konkretnych domów aukcyjnych po zweryfikowaniu regulaminów,
- synchronizacja między urządzeniami / konto i ewentualny PIN/biometria — późniejszy etap wymagający odrębnej architektury prywatności,
- rozbudowa demo monet i finalna szata graficzna dopiero po stabilizacji,
- Standard/PRO i docelowe aplikacje mobilne/desktop.