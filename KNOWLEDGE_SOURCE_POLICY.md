# APOMONET Knowledge Builder — polityka źródeł

Cel: budować własną bazę wiedzy numizmatycznej z faktów, bez kopiowania zdjęć, opisów aukcyjnych, układu katalogów ani chronionych kompilacji.

## Dozwolony rekord wiedzy APOMONET
Przechowujemy wyłącznie znormalizowane fakty, np.: kraj/emitent, władca, rok, nominał, mennica, metal, masa, średnica, wariant/odmiana, cechy odróżniające, znak menniczy, wariant legendy, typ rantu, numer katalogowy, rzadkość jeśli wiarygodna, data sprzedaży, cena, waluta oraz link/nazwa źródła jako provenance.

Nie przechowujemy: zdjęć źródłowych, skanów, pełnych opisów, charakterystycznych autorskich sformułowań, komentarzy marketingowych ani kopii układu cudzej bazy.

## Tryby źródeł
- WCN: RESEARCH_MANUAL — publiczne archiwum może być używane do ręcznej weryfikacji faktów; automatyczny masowy import wymaga osobnej zgody/pewnej podstawy.
- Niemczyk: PERMISSION_REQUIRED_FOR_AUTOMATION — regulamin zabrania automatycznego pobierania/agregowania danych bez pisemnego zezwolenia. Ręczna analiza pojedynczych rekordów może służyć jako wskazówka badawcza; w APOMONET zapisujemy własny znormalizowany rekord faktograficzny i link źródłowy, nie opis.
- NumisBids: MANUAL_ONLY — regulamin zabrania automatycznego harvestowania i przechowywania informacji z serwisu.
- Coinstrail: MANUAL_REFERENCE_ONLY — regulamin zakazuje kopiowania, powielania i wykorzystywania materiałów serwisu; nie budujemy automatycznego importera bez zgody.
- OneBid: RESEARCH_MANUAL_PENDING_REVIEW — archiwum jest przeznaczone do analizy historycznych wyników, ale dopóki nie mamy jednoznacznej zgody na automatyczne pobieranie, używamy go tylko do ręcznej weryfikacji i linkowania.

## Zasada konsensusu
Pojedynczy rekord aukcyjny jest obserwacją, nie prawdą katalogową. Fakt uznajemy za mocniejszy, gdy zgadza się w co najmniej dwóch niezależnych źródłach lub jest potwierdzony katalogiem/ekspertem. Rozbieżności zachowujemy jawnie.

## Zasada provenance
Każdy rekord wiedzy musi mieć: nazwę źródła, URL lub identyfikator rekordu, datę sprawdzenia i informację, czy fakt był potwierdzony przez eksperta. APOMONET nigdy nie ukrywa źródła pochodzenia wiedzy.

## Automatyzacja
Crawler/scraper jest domyślnie WYŁĄCZONY dla wszystkich źródeł. Włączamy automatyczny adapter dopiero dla źródła, które udostępnia legalne API/feed albo daje pisemną zgodę.