#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_OUTPUT = resolve(ROOT, "data/research/spink-1900-selective-extraction-v1.json");
const AS_OF = "2026-08-29";

const SEARCH_GROUPS = [
  {
    id: "poland",
    weight: 5,
    patterns: ["Poland", "Polish", "Polen", "Pologne", "Polonia"],
  },
  {
    id: "polish-mints",
    weight: 4,
    patterns: ["Danzig", "Thorn", "Elbing", "Warsaw", "Cracow", "Posen", "Bromberg", "Vilna"],
  },
  {
    id: "linked-mints",
    weight: 2,
    patterns: ["Riga", "Livonia"],
  },
  {
    id: "polish-rulers",
    weight: 3,
    patterns: ["Sigismund", "Batory", "Bathory", "Sobieski", "Jagiell", "Jagello", "Ladislaus", "Casimir"],
  },
  {
    id: "heavy-gold",
    weight: 1,
    patterns: ["ducat", "double ducat", "triple ducat", "Portugal", "portugal"],
  },
];

const MANUAL_DECISIONS = new Map([
  [31, {
    status: "EXCLUDED_NON_COIN",
    confidence: "HIGH",
    decision: "Wzmianki dotyczą medali Sebastiana Dadlera, w tym medalu Władysława IV z Gdańska z 1642 r.; nie zasilają pozytywnego katalogu monet.",
    objectKind: "medal",
  }],
  [304, {
    status: "EXCLUDED_NON_COIN",
    confidence: "HIGH",
    decision: "Strona opisuje miejskie i cechowe znaki/marki z Gdańska, Torunia i Rygi; materiał nadaje się wyłącznie do kolejki negatywnej obiektów podobnych do monet.",
    objectKind: "token",
  }],
  [438, {
    status: "CORROBORATED_EXISTING_TYPE",
    confidence: "HIGH",
    decision: "Dukat 1831 ze znakiem rosyjskiego orła, opisany jako używany w Polsce, odpowiada muzealnym rekordom dukata powstania listopadowego z mennicy warszawskiej.",
    runtimeRecordId: "historical-sale-fact:spink-1900-warsaw-ducat-1831",
  }],
  [665, {
    status: "CORROBORATED_EXISTING_TYPE",
    confidence: "HIGH",
    decision: "Powtórne notowanie tego samego typu dukata 1831; nie tworzy drugiego typu ani drugiego niezależnego źródła.",
    runtimeRecordId: "historical-sale-fact:spink-1900-warsaw-ducat-1831",
  }],
]);

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith("--") || value == null) throw new Error(`Niepoprawny argument: ${key || "<brak>"}`);
    options[key.slice(2)] = value;
  }
  for (const required of ["searchtext", "pageindex", "pagenumbers"]) {
    if (!options[required]) throw new Error(`Brak wymaganego argumentu --${required}`);
  }
  return options;
}

function readMaybeGzip(path) {
  const bytes = readFileSync(resolve(path));
  return path.endsWith(".gz") ? gunzipSync(bytes) : bytes;
}

function normalizedPageText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function groupMatches(pageText, group) {
  const matches = [];
  for (const pattern of group.patterns) {
    const expression = new RegExp(`\\b${pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "giu");
    const count = [...pageText.matchAll(expression)].length;
    if (count > 0) matches.push({ token: pattern, count });
  }
  return matches;
}

function reviewReason(groupIds) {
  if (groupIds.includes("poland") && groupIds.includes("heavy-gold")) return "Polski kontekst i ciężkie złoto";
  if (groupIds.includes("polish-mints")) return "Mennica polska lub miejska związana z mennictwem Rzeczypospolitej";
  if (groupIds.includes("polish-rulers")) return "Władca lub dynastia wymagająca dopasowania do katalogu instytucjonalnego";
  if (groupIds.includes("linked-mints")) return "Mennictwo powiązane terytorialnie; konieczne rozdzielenie emitenta i okresu";
  return "Ogólny polski kontekst numizmatyczny";
}

export function extractSelectiveCandidates({ searchText, pageIndex, pageNumbers }) {
  const printedPages = new Map((pageNumbers.pages || []).map((page) => [Number(page.leafNum), page]));
  const candidates = [];

  pageIndex.forEach((entry, scanLeaf) => {
    const [start, end] = entry;
    const pageText = normalizedPageText(searchText.slice(start, end));
    if (!pageText) return;

    const groups = SEARCH_GROUPS.flatMap((group) => {
      const matches = groupMatches(pageText, group);
      return matches.length ? [{ id: group.id, weight: group.weight, matches }] : [];
    });
    const ids = groups.map((group) => group.id);
    const anchored = ids.some((id) => ["poland", "polish-mints", "linked-mints", "polish-rulers"].includes(id));
    if (!anchored) return;

    const printed = printedPages.get(scanLeaf);
    const uniqueGroups = new Set(ids).size;
    const manualDecision = MANUAL_DECISIONS.get(scanLeaf);
    candidates.push({
      id: `spink-1900-leaf-${String(scanLeaf).padStart(3, "0")}`,
      status: manualDecision?.status || "RESEARCH_ONLY",
      runtimeEligible: manualDecision?.status === "CORROBORATED_EXISTING_TYPE",
      scanLeaf,
      viewerPage: `${scanLeaf}/706`,
      printedPageCandidate: printed?.pageNumber || "",
      printedPageConfidence: Number(printed?.confidence || 0),
      groups: groups.map((group) => ({ id: group.id, matches: group.matches })),
      score: groups.reduce((sum, group) => sum + group.weight, 0),
      confidence: manualDecision?.confidence || (uniqueGroups >= 3 ? "MEDIUM" : "LOW"),
      reviewReason: reviewReason(ids),
      manualDecision: manualDecision?.decision || "",
      objectKind: manualDecision?.objectKind || "",
      runtimeRecordId: manualDecision?.runtimeRecordId || "",
      ocrPageSha256: createHash("sha256").update(pageText).digest("hex"),
      independentSourceRequired: true,
      imagePromoted: false,
    });
  });

  return candidates.sort((left, right) => right.score - left.score || left.scanLeaf - right.scanLeaf);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const searchText = readMaybeGzip(args.searchtext).toString("utf8");
  const pageIndex = JSON.parse(readMaybeGzip(args.pageindex).toString("utf8"));
  const pageNumbers = JSON.parse(readMaybeGzip(args.pagenumbers).toString("utf8"));
  const candidates = extractSelectiveCandidates({ searchText, pageIndex, pageNumbers });
  const output = resolve(args.output || DEFAULT_OUTPUT);

  const result = {
    schemaVersion: 1,
    extractedAt: AS_OF,
    source: {
      id: "spink-circular-1900",
      title: "Spink & Son's Numismatic Circular, vol. VIII–IX, 1899–1901",
      publicationYear: 1900,
      pages: pageIndex.length,
      commonsUrl: "https://commons.wikimedia.org/wiki/File:Spink_%26_Son%27s_Numismatic_Circular_1900_volume_VIII.djvu",
      internetArchiveUrl: "https://archive.org/details/spinkcircular1900v08v09",
      rightsDecision: "INDEX_FACTS_ONLY",
      rightsEvidence: [
        "Wikimedia Commons oznacza plik jako PD-scan/PD-old-70 i Public Domain Mark 1.0.",
        "Egzemplarz OCR Internet Archive zawiera prośbę Google o brak redystrybucji i użycia komercyjnego; dlatego wynik przechowuje tylko indeks stron, tokeny trafień i skróty kryptograficzne, bez OCR i obrazów.",
      ],
    },
    extractionPolicy: {
      rule: "Trafienie OCR jest tropem, nie gotowym rekordem monety.",
      promotionGate: "Niezależne źródło instytucjonalne plus jednoznaczne cechy emitenta, nominału, roku i mennicy.",
      storedContent: "Indeks strony, tokeny trafień, wynik ważony i SHA-256 strony; bez przepisywania opisu, OCR, układu katalogu i fotografii.",
    },
    queryGroups: SEARCH_GROUPS,
    stats: {
      scannedPages: pageIndex.length,
      candidatePages: candidates.length,
      mediumConfidencePages: candidates.filter((candidate) => candidate.confidence === "MEDIUM").length,
      lowConfidencePages: candidates.filter((candidate) => candidate.confidence === "LOW").length,
      corroboratedPages: candidates.filter((candidate) => candidate.status === "CORROBORATED_EXISTING_TYPE").length,
      excludedNonCoinPages: candidates.filter((candidate) => candidate.status === "EXCLUDED_NON_COIN").length,
      runtimeRecordsAdded: new Set(candidates.map((candidate) => candidate.runtimeRecordId).filter(Boolean)).size,
      imagesAdded: 0,
      researchOnlyCandidates: candidates.filter((candidate) => candidate.status === "RESEARCH_ONLY").length,
    },
    candidates,
  };

  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ output, ...result.stats }, null, 2));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
