# APOMONET Vision v2 — trwały checkpoint LAB

- Data: 2026-09-30
- Gałąź: `codex/vision-lab-20260930`
- Commit bazowy: `6d6a0e25f021123a7a8630cc471150db02d672c1`
- Planowany tag: `apomonet-vision-v2-lab-20260930`
- Produkcja/main: bez zmian
- Płatne wywołania: 0
- Dane użytkowników: 0
- Manifest SHA-256: `2469a2a725c5c1d88ee5c3422a9c15070bb8e9623499694c827091930ff81714`
- Korpus retrieval: 493 typy, 1971 obrazów, różne rekordy egzemplarzy query/reference
- Korpus segmentacji: 28 źródeł, 280 kontrolowanych ramek
- Najlepszy visual retrieval: SigLIP 2 `ORIGINAL + NORMALIZED`, Top-1/3/5 47,67/67,14/73,83%
- Decyzja segmentacji: OpenCV GrabCut jako kolejny kandydat LAB dla `DISPLAY_CUTOUT`; brak promocji produkcyjnej
- Decyzja OCR: generyczny Tesseract usunięty z domyślnego rankingu; brak hard veto
- Decyzja metric learning: odrzucony w tej wersji, ponieważ pogorszył niewidziane typy
- Decyzja auto-capture: odroczona do testu urządzeń, ponieważ bad-frame recall wyniósł 8,04%

Raport główny: `lab/results/APOMONET_VISION_V2_DECISION_2026-09-30.md`.

## Odtworzenie

```bash
node scripts/lab-prepare-large-visual-corpus.mjs
.venv-vision-lab/bin/python -u scripts/lab-vision-v2-retrieval.py
.venv-vision-lab/bin/python -u scripts/lab-vision-v2-segmentation.py
.venv-vision-lab/bin/python -u scripts/lab-vision-v2-ocr.py
node --test tests/*.test.mjs tests/*.test.js *.test.mjs *.test.js test-*.mjs
```

Wersje środowiska, rewizje modeli, commity MobileSAM/SAM 2 i hash checkpointu są zapisane w `lab/config/vision-v2-benchmark-2026-09-30.json`. Obrazy i cache nie należą do commitu; manifest jest deterministycznie odtwarzany ze źródeł runtime i sprawdzany po zapisanym SHA-256.

## SHA-256 artefaktów

| Plik | SHA-256 |
|---|---|
| konfiguracja | `40e8b5ebcb6e99f96771efa906c468e4c5615c55b843de32b6914e5b9d6def19` |
| retrieval JSON | `324936ee12eaa827cf8c6b73f8f6135efba7ac3b1e75317d5d21e8cf63de6d48` |
| segmentation JSON | `eb1902023095a3ba7fe640e8e083280a6b615ba9bcc3c94961ddedb27a5f8fb6` |
| OCR JSON | `57d5ec2a4486fd54be9198cc1a2b741beaa96bc8cdcada91662771c433851ba4` |
| research build-vs-buy | `217241259815c2b070510d6defb97516584ba7d979bf33df32a796bc9f290464` |
| raport decyzyjny | `422dfabbe7fe017b6accc427e6fedd1f8933981803bee2dfbd59972db60f3656` |

Checkpoint jest kompletny dopiero po przejściu testów, utworzeniu commitu i tagu wskazanego powyżej.
