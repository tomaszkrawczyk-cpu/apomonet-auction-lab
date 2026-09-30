# APOMONET Vision Lab — gotowe technologie, licencje i build vs buy

Data weryfikacji: 2026-09-30. Ten dokument opisuje stan bieżący i nie jest zgodą prawną ani zakupową. Nie uruchomiono płatnego planu, nie przekazano danych użytkowników i nie użyto produkcyjnych sekretów.

## Wniosek skrócony

- Nie kupować ani nie budować osobnej platformy CV na tym etapie. Najmniej ryzykowny wariant to własny katalog i scoring APOMONET, standardowe biblioteki/model on-device dla wejścia oraz istniejący model multimodalny tylko jako arbiter.
- Użyć gotowych prymitywów urządzenia do podglądu kadru, ostrości, obcięcia i OCR. Detekcja ma zwracać bezpieczny prostokąt, a nie „idealną” maskę.
- W wykonanym benchmarku kontrolowanym OpenCV GrabCut był najlepszym lekkim kandydatem do DISPLAY_CUTOUT. MobileSAM i SAM 2.1 zbyt często podcinały pas rantu; nie mogą wejść jako domyślne bez jawnego poszerzenia/naprawy maski i testu na fizycznych telefonach. DISPLAY_CUTOUT nigdy nie może zastąpić ORIGINAL ani obrazu NORMALIZED do rozpoznawania.
- SAM 3.1 jest technicznie aktualnym następcą, lecz obecny oficjalny wariant ma 848 mln parametrów, wymaga checkpointu z kontrolowanym dostępem oraz oficjalnie CUDA 12.6+. Nie jest kandydatem on-device i nie wymaga blokowania pozostałych prac.
- Numista Search by Image jest jedynym potwierdzonym, publicznie opisanym API numizmatycznym o sensownym zakresie. Jest kandydatem na płatnego arbitra porównawczego, nie na rdzeń ani źródło katalogu APOMONET.

## Kandydaci photo / detection / segmentation

| Kandydat | Licencja / użycie komercyjne | Lokalnie / telefon | Prywatność i retencja | Koszt / lock-in | Decyzja LAB |
|---|---|---|---|---|---|
| OpenCV + własne proste reguły / GrabCut | Apache-2.0; komercyjnie dopuszczalne | Tak, Android/iOS/WebAssembly | Obraz nie opuszcza urządzenia | Brak opłaty per analiza; niski lock-in | Zachować proste CV jako szybki quality gate, fallback i generator bezpiecznego boxa. GrabCut był najlepszym zmierzonym kandydatem do DISPLAY_CUTOUT, ale nadal wymaga walidacji rantu i telefonu |
| MobileSAM `vit_t` | Apache-2.0 | Lokalnie; oficjalny eksport ONNX; checkpoint około 39 MiB | Lokalnie: brak transmisji | Brak opłaty per analiza; koszt integracji/energii | Nie wybierać domyślnie: z lokalnym boxem średni rim recall wyniósł 0,5644, a utrata rantu wystąpiła w 99,29% ramek według progu testu. Zachować wyłącznie jako wariant R&D po naprawie maski |
| SAM 2.1 Hiera Tiny | Apache-2.0 | Lokalnie na serwerze/desktop; checkpoint około 149 MiB; telefon wymaga oddzielnej optymalizacji | Lokalnie: brak transmisji | Brak opłaty per analiza; większy koszt pamięci i czasu | Nie wybierać domyślnie: lokalny box był wąskim gardłem, a maska nadal regularnie ścinała zewnętrzny pas rantu. Może pozostać sufitem jakości/fallbackiem R&D |
| SAM 3.1 | Niestandardowa SAM License; wymaga przeglądu prawnego przed produkcją | Oficjalne wymagania: Python 3.12+, PyTorch 2.7+, CUDA 12.6+; 848 mln parametrów | Lokalna instalacja możliwa po uzyskaniu dostępu do wag | Gated checkpoint, duże wymagania GPU, istotny lock-in modelowy | Nie uruchamiać w mobilnym v2; wrócić do testu tylko na odrębnym GPU i po akceptacji warunków |
| Apple Vision foreground mask | Systemowa technologia Apple; użycie na zasadach SDK/platformy | On-device na obsługiwanym iOS | Bez wysyłania obrazu przez APOMONET | Bez opłaty per wywołanie; pełny lock-in Apple | Najpierw spike natywny na iOS; używać tylko do UI/cutout po walidacji rantu |
| Google ML Kit object detection | Warunki Google APIs; przetwarzanie wejścia odbywa się na urządzeniu; dostępne bez opłaty | Android/iOS, tryb zdjęcia i live feed | Google deklaruje brak wysyłania obrazu i wyniku do serwerów ML Kit | Bez opłaty; lock-in SDK Google | Kandydat do podglądu kadru i śledzenia boxa, nie gotowy klasyfikator monet |
| MediaPipe Tasks | Apache-2.0 dla frameworka; sprawdzić licencję konkretnego modelu | Android/iOS; IMAGE/VIDEO/LIVE_STREAM | Lokalnie przy modelu w aplikacji | Brak opłaty; średni lock-in API | Dobra warstwa uruchomieniowa dla własnego lekkiego detektora/segmentatora, lecz ogólny Image Segmenter wymaga modelu kategorii „moneta” |
| Roboflow Inference | Rdzeń Apache-2.0; modele mają własne licencje; katalog enterprise ma osobną licencję | Self-host/offline, edge i cloud | Self-host może pozostać lokalny; cloud podlega polityce Roboflow | Self-host inference bez kredytów od 2026-09-18; cloud per image; zależność od registries/workflows opcjonalna | Nie jest konieczny do bieżącego pipeline’u. Rozważyć jako framework operacyjny dopiero przy wielu własnych modelach i monitoringu |

Źródła: [SAM 3](https://github.com/facebookresearch/sam3), [SAM 2](https://github.com/facebookresearch/sam2), [MobileSAM](https://github.com/ChaoningZhang/MobileSAM), [Apple Vision](https://developer.apple.com/documentation/vision/generateforegroundinstancemaskrequest), [ML Kit](https://developers.google.com/ml-kit/vision/object-detection), [ML Kit terms/privacy](https://developers.google.com/ml-kit/terms), [MediaPipe Image Segmenter](https://developers.google.com/edge/mediapipe/solutions/vision/image_segmenter/android), [Roboflow Inference](https://github.com/roboflow/inference), [Roboflow 2026 pricing change](https://blog.roboflow.com/making-it-easier-cheaper-to-deploy-with-roboflow/).

## Kandydaci retrieval / recognition

| Kandydat | Licencja / lokalność | Zależności | Rola możliwa w APOMONET | Decyzja LAB |
|---|---|---|---|---|
| DINOv2 Small | Apache-2.0; lokalny embedding | PyTorch/timm; możliwy eksport | Wizualny retrieval różnych egzemplarzy | Pełny benchmark na zamrożonym korpusie |
| DINOv3 Small | DINOv3 License (Meta); Meta opisuje wydanie jako komercyjne, ale jest to licencja niestandardowa | PyTorch/timm; większe ryzyko licencyjne niż DINOv2 | Nowoczesny backbone wizualny | Benchmarkować; przed produkcją zatwierdzić warunki konkretnego checkpointu |
| SigLIP 2 image tower | Implementacja big_vision/timm Apache-2.0; sprawdzić kartę konkretnego checkpointu | Większy model i pamięć | Semantyczny embedding/retrieval | Benchmarkować jako reprezentację ogólną, ale nie zakładać przewagi bez pomiaru |
| MobileNetV4 Small | Implementacja timm Apache-2.0; zweryfikować pochodzenie wag w karcie modelu | Mały model, łatwiejszy mobile inference | Tani embedding on-device / preselekcja | Benchmarkować jako mobilny dolny pułap kosztu |
| Metric learning na embeddingach | Kod własny nad gotowym backbone’em; dataset APOMONET tylko zgodnie z polityką źródeł | Wymaga legalnych par różnych egzemplarzy | Uczy pytanie „czy to ten sam typ?”, bez klasyfikatora wszystkich monet | Testować z rozdzieleniem tożsamości typów train/test; wdrażać wyłącznie przy przewadze na niewidzianych typach |
| Katalog APOMONET + soft metadata | Własna warstwa wiedzy | OCR/atrybuty są niepewne | Shortlist, wyjaśnienie i bezpieczne „nie wiem” | Pozostawić jako rdzeń; nigdy nie stosować błędnego OCR jako twardego veto |

Źródła: [DINOv2](https://github.com/facebookresearch/dinov2), [DINOv3](https://github.com/facebookresearch/dinov3), [Meta DINOv3](https://ai.meta.com/research/dinov3/), [SigLIP 2](https://arxiv.org/abs/2502.14786), [timm](https://github.com/huggingface/pytorch-image-models).

## Gotowe API i usługi

### Numista API

Publiczna dokumentacja potwierdza endpoint Search by Image i komercyjne użycie API. Plan bezpłatny nie obejmuje rozpoznawania obrazu. Stan na 2026-09-30:

- aktywacja planu płatnego: 100 EUR netto jednorazowo;
- minimum miesięczne po pierwszym miesiącu: 100 EUR netto;
- Search by Image: 0,030 EUR za pierwsze 20 tys. poprawnych odpowiedzi, 0,024 EUR dla 20 001–50 000 i 0,018 EUR powyżej;
- wymagane oznaczenie źródła „Numista” oraz widoczne N#;
- brak prawa do wystawienia własnego feedu/bulk downloadu; ograniczenia przechowywania danych katalogowych należy uwzględnić w projekcie cache;
- zgubiony klucz powinien zostać odwołany/zastąpiony; nie próbowano odzyskiwać starego klucza Europeana ani używać go do tego testu.

Decyzja: nie aktywowano. Po zgodzie właściciela wykonać osobny płatny benchmark na dokładnie tym samym zamrożonym zbiorze i traktować wynik jako zewnętrznego arbitra, nie źródło prawdy ani zamiennik katalogu.

Źródła: [Numista API](https://en.numista.com/api/index.php), [cennik](https://en.numista.com/api/pricing.php), [warunki](https://en.numista.com/api/license.php).

### Roboflow

Roboflow daje wygodny inference server, workflow i możliwość uruchomienia offline. Od 2026-09-18 self-hosted inference nie zużywa kredytów, a Core ma bezpłatny poziom z prywatnymi projektami. Nie eliminuje to obowiązku sprawdzenia licencji każdego modelu; komponenty enterprise i wybrane modele mogą wymagać osobnej licencji. Dla dwóch modeli APOMONET bez monitoringu floty wprowadza dziś więcej warstw niż usuwa.

Decyzja: nie integrować w v2. Zachować jako opcję operacyjną, gdy pojawi się kilka wdrożonych modeli, potrzeba device management lub centralnego monitoringu.

### Multimodalny arbiter OpenAI

Repozytorium już korzysta z Responses API i modelu vision; LAB nie wykonywał dodatkowych płatnych wywołań. Oficjalna dokumentacja wskazuje rozliczanie obrazów i tekstu tokenami oraz odrębne ustawienia retencji. Dla `/v1/responses` treść nie jest używana do treningu; standardowo istnieje retencja abuse monitoring i zależnie od konfiguracji application state, a Zero Data Retention wymaga zatwierdzenia na poziomie organizacji/projektu. Samo `store: false` nie jest równoznaczne z ZDR.

Decyzja: zachować wyłącznie dla przypadków niejednoznacznych po lokalnym retrieval. Przed produkcyjnym Vision v2 jawnie ustawić `store: false`, zweryfikować politykę projektu i nie wysyłać obrazu do zewnętrznego arbitra bez zgody użytkownika w polityce prywatności. Koszt raportować z rzeczywistych tokenów odpowiedzi; nie wpisywać stałej ceny „za monetę”.

Źródła: [OpenAI pricing](https://developers.openai.com/api/docs/pricing), [vision input](https://developers.openai.com/api/docs/guides/images-vision), [data controls](https://developers.openai.com/api/docs/guides/your-data).

## Rozwiązania odrzucone jako bieżący rdzeń

- Aplikacje konsumenckie bez publicznego SDK/API i warunków integracji (np. Coinoscope/CoinSnap) nie są technicznym komponentem APOMONET. Można je porównać ręcznie w osobnym, kontrolowanym teście aplikacji, ale wynik nie daje ścieżki integracji.
- Generyczny background removal dla ludzi/produktów nie wystarcza: priorytetem APOMONET jest zachowanie rantu i detalu cienkich, nieregularnych monet, a nie efektowna maska.
- Duży własny klasyfikator wszystkich typów pozostaje odrzucony, dopóki retrieval różnych egzemplarzy oraz soft metadata nie wykażą sufitu jakości i nie będzie legalnego, reprezentatywnego zbioru treningowego.

## Warunki ponownego rozpatrzenia build vs buy

1. Numista: zgoda na płatność i warunki, 500–1000 zamrożonych zapytań, pomiar Top-1/3/5, abstention, p50/p90 oraz wyników okresowych.
2. SAM 3.1: dostęp do oficjalnego checkpointu, osobny GPU, przegląd SAM License i ten sam syntetyczny/telefoniczny zbiór segmentacyjny.
3. Natywne iOS/Android: co najmniej dwa urządzenia każdej platformy, eksport MobileSAM/CoreML/TFLite lub natywna maska, pomiar energii, pamięci, p50/p90 i rantu.
4. Roboflow: dopiero kiedy koszt utrzymania własnego runtime’u, monitoringu i aktualizacji przekroczy koszt zależności od usługi.
