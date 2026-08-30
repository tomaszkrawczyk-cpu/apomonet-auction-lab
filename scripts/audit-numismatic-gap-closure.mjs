#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";
import {
  localReferenceCandidates,
  negativeVisualReferenceCandidates,
  recognitionCatalogPolicy,
} from "../lib/recognition-core.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const JSON_OUTPUT = resolve(ROOT, "data/recognition/gap-closure-audit-v1.json");
const REPORT_OUTPUT = resolve(ROOT, "NUMISMATIC_GAP_CLOSURE_2026-08-29.md");
const AS_OF = "2026-08-29";
const hierarchy = JSON.parse(gunzipSync(readFileSync(
  resolve(ROOT, "data/recognition/recognition-hierarchy-v1.json.gz"),
)).toString("utf8"));
const historicalCollections = JSON.parse(readFileSync(
  resolve(ROOT, "data/research/historical-collection-index-v1.json"),
  "utf8",
));
const oldCatalogueSweep = JSON.parse(readFileSync(
  resolve(ROOT, "data/research/public-domain-catalogue-sweep-v1.json"),
  "utf8",
));

function clean(value) {
  return String(value ?? "").trim();
}

function normalized(value) {
  return clean(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ł/g, "l")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function canonicalMint(value) {
  const mint = normalized(value);
  const aliases = [
    [/\b(?:mennica panstwowa|panstwowa 1924 1994|warsaw|varsav\w*|warszawa)\b/, "warszawa"],
    [/\b(?:gedan\w*|gdansk|danzig)\b/, "gdansk"],
    [/\b(?:bromberg|bydgoszcz)\b/, "bydgoszcz"],
    [/\b(?:thorn|torun)\b/, "torun"],
    [/\b(?:cracow|krakau|krakow)\b/, "krakow"],
    [/\b(?:viln\w*|wilno)\b/, "wilno"],
  ];
  return aliases.find(([pattern]) => pattern.test(mint))?.[1] || mint;
}

function canonicalNominal(value) {
  return normalized(value)
    .replace(/\bducats?\b/g, "dukat")
    .replace(/\bdukatow\b/g, "dukat")
    .replace(/\bthalers?\b|\btalers?\b/g, "talar")
    .replace(/\bgroschen\b/g, "grosz")
    .replace(/\bschilling\b|\bsolidus\b/g, "szelag");
}

function sourceName(record) {
  return clean(record.source?.name || record.sourceName);
}

function yearNumber(record) {
  return Number(clean(record.year));
}

function runtimeIdentityKey(record) {
  if (clean(record.issueId)) return clean(record.issueId);
  return [
    normalized(record.ruler),
    clean(record.year),
    canonicalNominal(record.nominal),
    canonicalMint(record.mint),
    normalized(record.objectKind || "coin"),
  ].join("|");
}

function strictTypeKey(record) {
  if (clean(record.varietyId)) return clean(record.varietyId);
  return [runtimeIdentityKey(record), normalized(record.metal)].join("|");
}

function coverage(records) {
  return {
    records: records.length,
    coinTypes: new Set(records.map((record) => clean(record.coinTypeId)).filter(Boolean)).size,
    issues: new Set(records.map((record) => clean(record.issueId)).filter(Boolean)).size,
    varieties: new Set(records.map((record) => clean(record.varietyId)).filter(Boolean)).size,
    strictTypes: new Set(records.map(strictTypeKey)).size,
    runtimeIdentityGroups: new Set(records.map(runtimeIdentityKey)).size,
    withAnyImage: records.filter((record) => Array.isArray(record.images) && record.images.length > 0).length,
    withImagePair: records.filter((record) => Array.isArray(record.images) && record.images.length >= 2).length,
    withAnyLegend: records.filter((record) => record.obverseLegend || record.reverseLegend).length,
    withMint: records.filter((record) => clean(record.mint)).length,
  };
}

function percent(part, whole) {
  return whole ? `${((part / whole) * 100).toFixed(1)}%` : "0.0%";
}

const records = localReferenceCandidates();
const negatives = negativeVisualReferenceCandidates();
const prl = records.filter((record) => yearNumber(record) >= 1949 && yearNumber(record) <= 1989);
const interwar = records.filter((record) => record.periodId === "second-republic-and-war");
const medieval = records.filter((record) => record.periodId === "medieval");
const jagiellonian = records.filter((record) => record.periodId === "jagiellonian");
const elective = records.filter((record) => record.periodId === "elective-monarchy");
const partitions = records.filter((record) => record.periodId === "partitions-and-uprisings");

const sourceSets = new Map();
for (const record of records) {
  const key = runtimeIdentityKey(record);
  if (!sourceSets.has(key)) sourceSets.set(key, new Set());
  const source = sourceName(record);
  if (source) sourceSets.get(key).add(source);
}
const multiSourceIdentityGroups = [...sourceSets.values()].filter((sources) => sources.size >= 2).length;

const interwarFamilies = new Map();
for (const record of interwar) {
  const key = [clean(record.year), canonicalNominal(record.nominal), normalized(record.ruler)].join("|");
  if (!interwarFamilies.has(key)) interwarFamilies.set(key, []);
  interwarFamilies.get(key).push(record);
}
const interwarMultiMintFamilies = [...interwarFamilies.entries()].flatMap(([key, family]) => {
  const mints = [...new Set(family.map((record) => canonicalMint(record.mint)).filter(Boolean))];
  return mints.length > 1 ? [{ key, mints, records: family.length }] : [];
});
const interwarMissingMint = interwar.filter((record) => !clean(record.mint));
const interwarUncertainMint = interwar.filter((record) => /[?\/]/.test(clean(record.mint)));

const heavySourceIds = new Map([
  ["18215931", "Ducato srebrne"], ["18201941", "10 dukatów"], ["18202240", "10 dukatów"],
  ["18223471", "5 dukatów"], ["18223427", "10 dukatów"], ["18215922", "10 dukatów"],
  ["18297149", "3 dukaty"], ["18245473", "6 dukatów"], ["18227317", "30 dukatów"],
  ["18215924", "5 dukatów"], ["18223440", "10 dukatów"], ["18244673", "5 dukatów"],
  ["18237022", "3 dukaty"], ["18237019", "4 dukaty"], ["18244668", "3 dukaty"],
  ["18203617", "10 dukatów"],
]);
const heavyResolution = [...heavySourceIds].map(([sourceId, expectedNominal]) => {
  const record = records.find((item) => item.source?.recordId === sourceId);
  return {
    sourceId,
    expectedNominal,
    actualNominal: record?.nominal || "",
    resolved: record?.nominal === expectedNominal,
    sourceUrl: record?.source?.url || "",
  };
});

const forbiddenPositive = /\b(?:falsyfikat|falszyw|fałszyw|counterfeit|forgery|kopia|copy|replika|replica|coin mould)\b/i;
const positiveNegativeLeaks = records.filter((record) => forbiddenPositive.test(`${record.title} ${record.objectKind}`));

const audit = {
  schemaVersion: 1,
  asOf: AS_OF,
  policy: {
    typeDefinition: "strict type = runtime identity (ruler, year, denomination, normalized mint, object kind) plus metal",
    multiSourceDefinition: "at least two independent source names in one runtime identity group",
    images: "remote item-level open references; files are not bulk-downloaded",
  },
  totals: {
    positiveRecords: records.length,
    strictTypes: new Set(records.map(strictTypeKey)).size,
    runtimeIdentityGroups: sourceSets.size,
    multiSourceIdentityGroups,
    positiveNegativeLeaks: positiveNegativeLeaks.length,
    hierarchy: hierarchy.stats,
    researchCollections: historicalCollections.stats,
    oldCatalogueSweep: oldCatalogueSweep.stats,
  },
  areas: {
    peopleRepublic: coverage(prl),
    secondRepublicAndWar: {
      ...coverage(interwar),
      missingMintRecords: interwarMissingMint.length,
      uncertainMintRecords: interwarUncertainMint.length,
      legitimateMultiMintFamilies: interwarMultiMintFamilies.length,
      multiMintFamilies: interwarMultiMintFamilies,
    },
    medieval: coverage(medieval),
    jagiellonian: coverage(jagiellonian),
    electiveMonarchy: coverage(elective),
    partitionsAndUprisings: coverage(partitions),
    negativeVisual: {
      records: negatives.length,
      pairedGroups: recognitionCatalogPolicy.negativeVisualPairedGroupCount,
      byClass: Object.fromEntries(["counterfeit", "replica", "coin-mould"].map((kind) => [
        kind,
        negatives.filter((record) => record.negativeClass === kind).length,
      ])),
    },
    heavyIkmk: {
      reviewed: heavyResolution.length,
      resolved: heavyResolution.filter((item) => item.resolved).length,
      records: heavyResolution,
    },
  },
};

const md = `# APOMONET — raport domknięcia luk bazy (${AS_OF})

## Wynik

Pozytywny katalog runtime zawiera **${audit.totals.positiveRecords.toLocaleString("pl-PL")} egzemplarzy źródłowych**. Są teraz trwale przypisane do **${hierarchy.stats.coinTypes.toLocaleString("pl-PL")} typów nadrzędnych**, **${hierarchy.stats.issues.toLocaleString("pl-PL")} emisji** i **${hierarchy.stats.varieties.toLocaleString("pl-PL")} odmian**. **${hierarchy.stats.multiSourceIssues.toLocaleString("pl-PL")} emisji** ma co najmniej dwa niezależne źródła, a **${hierarchy.stats.reviewFlaggedCoinTypes} typów** pozostaje świadomie oznaczonych do ręcznej kontroli zamiast automatycznego scalenia. Osobny korpus negatywny ma **${negatives.length} legalnych obrazów** i nie miesza się z identyfikacją pozytywną (wycieki: **${audit.totals.positiveNegativeLeaks}**).

### Korekta wcześniejszych liczników

Wartości „831 typów PRL” i „247 typów wieloźródłowych” nie były policzone tą samą jednostką. Obecny model rozróżnia: **typ nadrzędny** (rodzina katalogowa), **emisję** (rok/mennica), **odmianę** (metal i jawne cechy wariantu) oraz **egzemplarz źródłowy**. Po odrzuceniu fałszywych dat Europeany zakres PRL 1949–1989 ma **${audit.areas.peopleRepublic.records} egzemplarzy**, **${audit.areas.peopleRepublic.coinTypes} typów nadrzędnych**, **${audit.areas.peopleRepublic.issues} emisji** i **${audit.areas.peopleRepublic.varieties} odmian**.

## Stan obszarów

| Obszar | Egzemplarze | Typy nadrzędne | Emisje | Odmiany | Para zdjęć | Wniosek |
|---|---:|---:|---:|---:|---:|---|
| PRL 1949–1989 | ${audit.areas.peopleRepublic.records} | ${audit.areas.peopleRepublic.coinTypes} | ${audit.areas.peopleRepublic.issues} | ${audit.areas.peopleRepublic.varieties} | ${audit.areas.peopleRepublic.withImagePair} | dane techniczne są znacznie mocniejsze niż legalna warstwa wizualna |
| II RP i wojna 1918–1945 | ${audit.areas.secondRepublicAndWar.records} | ${audit.areas.secondRepublicAndWar.coinTypes} | ${audit.areas.secondRepublicAndWar.issues} | ${audit.areas.secondRepublicAndWar.varieties} | ${audit.areas.secondRepublicAndWar.withImagePair} | ${audit.areas.secondRepublicAndWar.legitimateMultiMintFamilies} rodzin ma rzeczywiście więcej niż jedną mennicę; nie wolno ich automatycznie scalać |
| Średniowiecze do 1385 | ${audit.areas.medieval.records} | ${audit.areas.medieval.coinTypes} | ${audit.areas.medieval.issues} | ${audit.areas.medieval.varieties} | ${audit.areas.medieval.withImagePair} | legendy IKMK poprawiły sito, ale nie zastępują typologii stempli |
| Jagiellonowie 1386–1572 | ${audit.areas.jagiellonian.records} | ${audit.areas.jagiellonian.coinTypes} | ${audit.areas.jagiellonian.issues} | ${audit.areas.jagiellonian.varieties} | ${audit.areas.jagiellonian.withImagePair} | wymaga dalszej kontroli rodzin i aliasów |
| Monarchia elekcyjna 1573–1795 | ${audit.areas.electiveMonarchy.records} | ${audit.areas.electiveMonarchy.coinTypes} | ${audit.areas.electiveMonarchy.issues} | ${audit.areas.electiveMonarchy.varieties} | ${audit.areas.electiveMonarchy.withImagePair} | mocny materiał egzemplarzowy; nadal potrzebna kontrola drzew |
| Zabory i powstania | ${audit.areas.partitionsAndUprisings.records} | ${audit.areas.partitionsAndUprisings.coinTypes} | ${audit.areas.partitionsAndUprisings.issues} | ${audit.areas.partitionsAndUprisings.varieties} | ${audit.areas.partitionsAndUprisings.withImagePair} | drzewa należy zatwierdzać gałąź po gałęzi |

## Co domknięto w tej partii

- Rozdzielono **${audit.areas.heavyIkmk.resolved}/${audit.areas.heavyIkmk.reviewed}** wskazanych pozycji IKMK: srebrne ducato oraz wielokrotności od 3 do 30 dukatów nie są już spłaszczane do zwykłego „Dukata”.
- Zachowano faktyczne legendy awersu i rewersu IKMK z licencją CC BY-SA 4.0 oraz rekordowym źródłem; nie pobrano narracyjnych opisów.
- Utworzono odseparowany korpus: ${audit.areas.negativeVisual.byClass.counterfeit} obrazów falsyfikatów, ${audit.areas.negativeVisual.byClass.replica} replik i ${audit.areas.negativeVisual.byClass["coin-mould"]} form odlewniczych; ${audit.areas.negativeVisual.pairedGroups} grup ma rozpoznaną parę stron.
- Zablokowano daty Europeany od 1949 r. jako daty emisji. Europeana bywała źródłem daty digitalizacji, więc nie może konkurować z katalogami PRL/NBP.
- Kontrola dodatniego katalogu nie wykazała przejścia jawnych falsyfikatów/replik do kandydatów pozytywnych.
- Każdy rekord runtime ma trwałe identyfikatory: \`coinTypeId\`, \`issueId\`, \`varietyId\` i \`specimenId\`. Silnik konsoliduje teraz aliasy źródeł po \`issueId\`, zamiast tworzyć kilka wyników przez różne pisownie władcy lub mennicy.
- Utworzono prawnie odseparowany indeks **${historicalCollections.stats.indexedCollectionsAndHoard} kolekcji i skarbu**, obejmujący pięć katalogów historycznych, MNW Potockich/Sobańskiego, Zbichorskiego i skarb z Koszyc. Zarejestrowano **${historicalCollections.stats.knownCandidateProvenanceEdges} kandydackie krawędzie proweniencji**; żadna nie została automatycznie uznana za tożsamość monety.
- Przejrzano **${oldCatalogueSweep.stats.sourcesReviewed} dawnych katalogów i periodyków** z osobną decyzją dla faktów i obrazów. Z otwartego skanu Spinka 1900 przeszukano **${oldCatalogueSweep.selectiveExtraction.pagesScanned} stron** i wytypowano **${oldCatalogueSweep.selectiveExtraction.candidatePages} stron**; **${oldCatalogueSweep.selectiveExtraction.researchOnlyPages}** pozostaje wyłącznie w kolejce, a jeden znormalizowany fakt wszedł do runtime dopiero po zgodności z MNK i MNW. **${oldCatalogueSweep.stats.newIndexedPolishPositionsInRestrictedCatalogues} pozycji polskich** z katalogów oznaczonych jako chronione zindeksowano bez kopiowania treści. Łącznie runtime zawiera **${oldCatalogueSweep.stats.runtimeRecordsAdded}** fakty z dawnych katalogów, wszystkie potwierdzone instytucjonalnie.

## Czego nadal potrzebujemy

1. **PRL — legalne pary awers–rewers.** Obecne pokrycie wizualne (${audit.areas.peopleRepublic.withImagePair} par na ${audit.areas.peopleRepublic.varieties} odmian) jest za małe. Następny bezpieczny kanał to umowy z muzeami albo zdjęcia użytkowników przekazane na jasnej licencji; obrazy NC/ND i zdjęcia aukcyjne pozostają wyłączone.
2. **Średniowiecze — typologia stempli.** Legend jest więcej, ale potrzebne są kontrolowane atomy: znaki, korony, układ krzyży/punktów, wariant orła i pary awers–rewers ze Stronczyńskiego oraz innych źródeł public-domain z numerem strony/tablicy.
3. **II RP — znaki mennicze, nie samo pole mennicy.** Liczba realnych rodzin wielomenniczych: ${audit.areas.secondRepublicAndWar.legitimateMultiMintFamilies}; rekordów bez mennicy: ${audit.areas.secondRepublicAndWar.missingMintRecords}; rekordów z zapisem niejednoznacznym: ${audit.areas.secondRepublicAndWar.uncertainMintRecords}. Każda odmiana wymaga osobnego markera wizualnego; nie wolno rozdzielać jej wyłącznie po roku.
4. **Drzewa historyczne — kontrola ekspercka danych, nie etykieta dla użytkownika.** Gałęzie zaborów, powstań, Jagiellonów i monarchii elekcyjnej wymagają checklisty kolizji nazw władców, mennic i nominałów.
5. **Potwierdzenia wieloźródłowe.** ${hierarchy.stats.multiSourceIssues} emisji ma dziś co najmniej dwa źródła; priorytetem powinny być typy często mylone oraz wszystkie rekordy bez legalnej pary zdjęć, nie mechaniczne podbijanie licznika.
6. **Negatywy polskich monet.** Nowy korpus jest legalny, ale międzynarodowy. Potrzebne są licencjonowane przykłady polskich odlewów, usuwanych znaków mennicy, przerabianych dat i współczesnych replik — z oświadczeniem właściciela zdjęcia.
7. **Dawne katalogi — dalsza kontrola selektywna.** Spink 1900 został przeszukany bez redystrybucji OCR: ${oldCatalogueSweep.selectiveExtraction.researchOnlyPages} stron wymaga niezależnego dopasowania, a dwa trafienia dotyczące tego samego dukata 1831 nie są liczone jako dwa źródła. Zakresy Karolkiewicza, Hess 1906 i Schlessinger 1929 oraz trzy krawędzie do Chełmińskiego/Frankiewicza są zapisane. Chronione fotografie i opisy pozostają poza runtime.

## Zasada bezpieczeństwa

Korpus negatywny może wywołać komunikat „cechy wymagają ostrożności / konsultacji”, ale nie werdykt autentyczności. APOMONET pozostaje narzędziem wstępnej identyfikacji, a brak dowodu nie jest dowodem autentyczności ani falsyfikatu.
`;

await mkdir(dirname(JSON_OUTPUT), { recursive: true });
await writeFile(JSON_OUTPUT, `${JSON.stringify(audit, null, 2)}\n`, "utf8");
await writeFile(REPORT_OUTPUT, md, "utf8");
console.log(JSON.stringify(audit.totals, null, 2));
console.log(`[audit] zapisano ${JSON_OUTPUT}`);
console.log(`[audit] zapisano ${REPORT_OUTPUT}`);
