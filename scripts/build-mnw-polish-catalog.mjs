#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT = resolve(ROOT, "data/recognition/mnw-polish-catalog-v1.json.gz");
const API = "https://cyfrowe-api.mnw.art.pl/api/search/Object/page";
const WEB = "https://cyfrowe.mnw.art.pl/pl/zbiory";
const IMAGE_BASE = "https://cyfrowe-cdn.mnw.art.pl/upload/cache/multimedia_big";
const POLISH_COINS_KEYWORD_ID = 175926;
const PUBLIC_DOMAIN_ID = 500;
const PAGE_SIZE = 1_000;
const RETRIEVED_AT = new Date().toISOString().slice(0, 10);

const NOMINALS = [
  [/\b(?:10|dziesi[eę]cio)[ -]?dukat/i, "Dziesięciodukat"],
  [/\b(?:5|pi[eę]cio)[ -]?dukat/i, "Pięciodukat"],
  [/\b(?:4|czworo)[ -]?dukat/i, "Czworodukat"],
  [/\b(?:3|trzy)[ -]?dukat/i, "Trzydukat"],
  [/\b(?:2|dwu)[ -]?dukat/i, "Dwudukat"],
  [/\bportugal/i, "Portugal"],
  [/\bdukat/i, "Dukat"],
  [/\bdwudenar/i, "Dwudenar"],
  [/\bdwugrosz/i, "Dwugrosz"],
  [/\b2\s+grosze\b/i, "Dwugrosz"],
  [/\bobol/i, "Obol"],
  [/\b(?:podw[oó]jny|dwu)?augustdor/i, "Augustdor"],
  [/\bwiardunek|\bferding/i, "Ferding"],
  [/\bdwutalar/i, "Dwutalar"],
  [/\bp[oó][łl]talar/i, "Półtalar"],
  [/\btalar/i, "Talar"],
  [/\bdonatyw/i, "Donatywa"],
  [/\bort\b/i, "Ort"],
  [/\bsz[oó]stak/i, "Szóstak"],
  [/\bczworak/i, "Czworak"],
  [/\btrojak/i, "Trojak"],
  [/\bp[oó][łl]torak/i, "Półtorak"],
  [/\bp[oó][łl]grosz/i, "Półgrosz"],
  [/\bgrosz/i, "Grosz"],
  [/\bszel[aą]g/i, "Szeląg"],
  [/\bdenar/i, "Denar"],
  [/\bbrakteat/i, "Brakteat"],
  [/\bkwartnik|\bquartensis/i, "Kwartnik"],
  [/\btrzeciak|\bternar/i, "Trzeciak"],
  [/\bfloren/i, "Floren"],
  [/\bz[łl]ot(?:y|e|ych)?\b/i, "Złoty"],
  [/\brubel/i, "Rubel"],
  [/\bkopiej/i, "Kopiejka"],
  [/\bmark(?:a|i)?\b/i, "Marka"],
  [/\bfenig|\bpfennig/i, "Fenig"],
];

function clean(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function nominalFromTitle(title) {
  return NOMINALS.find(([pattern]) => pattern.test(title))?.[1] || "";
}

function excludedObject(title) {
  return /\b(?:falsyfikat|fa[łl]szerstwo|fa[łl]szyw\w*|kopia|nowe bicie|odbitka stempla|replika)\b/i.test(title);
}

function yearFromDates(dates) {
  for (const date of dates || []) {
    const match = clean(date?.name).match(/\b(9\d{2}|1\d{3}|20\d{2})\b/);
    if (match) return match[1];
  }
  return "";
}

function authorByRole(record, pattern) {
  return (record.authors || []).find((author) => pattern.test(clean(author.role)));
}

function placeByRole(record, pattern) {
  return (record.createPlaces || []).find((place) => pattern.test(clean(place.role)));
}

function imageUrl(image) {
  if (!image?.filePath || !image?.extension) return "";
  return `${IMAGE_BASE}/${image.filePath}.${image.extension}`;
}

function makeRecord(record) {
  if (!(record.types || []).some((type) => clean(type.name).toLowerCase() === "moneta")) return null;
  const sourceTitle = clean(record.title);
  if (excludedObject(sourceTitle)) return null;
  const nominal = nominalFromTitle(sourceTitle);
  if (!nominal) return null;
  const ruler = authorByRole(record, /w[łl]adca/i);
  const mintmaster = authorByRole(record, /mincmistrz|zarz[aą]dca mennicy/i);
  const mint = placeByRole(record, /mennica/i);
  const country = placeByRole(record, /kraj/i);
  const primaryImage = imageUrl(record.image);
  const sourceUrl = `${WEB}/${record.id}`;
  return {
    id: `mnw:${record.id}`,
    title: sourceTitle,
    objectKind: /\bpr[oó]bn\w*\b/i.test(sourceTitle) ? "pattern-coin" : "coin",
    country: clean(country?.hierarchy || country?.name || "Polska / ziemie historycznie polskie"),
    ruler: clean(ruler?.name).replace(/\s*\([^)]*(?:kr[oó]l|ksi[aą][żz][ęe])[^)]*\)\s*$/i, ""),
    year: yearFromDates(record.createDates),
    nominal,
    metal: clean(record.materials?.[0]?.name),
    mint: clean(mint?.hierarchy || mint?.name),
    shape: "round",
    weightGrams: null,
    diameterMm: null,
    portrait: "",
    obverseLegend: "",
    reverseLegend: "",
    diagnosticMarkers: [
      mintmaster ? `zarządca-mennicy:${clean(mintmaster.name)}` : "",
      clean(record.inventoryNumber) ? `inwentarz:${clean(record.inventoryNumber)}` : "",
    ].filter(Boolean),
    images: primaryImage ? [primaryImage] : [],
    imageRights: primaryImage ? [{
      imageUrl: primaryImage,
      filePageUrl: sourceUrl,
      license: "Domena publiczna",
      licenseUrl: "https://creativecommons.org/publicdomain/mark/1.0/",
      creator: "",
      credit: "Muzeum Narodowe w Warszawie",
      retrievedAt: RETRIEVED_AT,
    }] : [],
    source: {
      type: "museum",
      name: "Muzeum Narodowe w Warszawie",
      recordId: clean(record.inventoryNumber) || `MNW object ${record.id}`,
      url: sourceUrl,
      rights: "Domena publiczna — rekord pobrany z jednoczesnym filtrem monety polskie i DOMENA PUBLICZNA",
      rightsCode: "public-domain",
      restricted: false,
      retrievedAt: RETRIEVED_AT,
      acquisitionEndpoint: `${API}/1?filter[keywords][]=${POLISH_COINS_KEYWORD_ID}&filter[copyrights][]=${PUBLIC_DOMAIN_ID}`,
    },
  };
}

async function fetchJson(url, attempt = 1) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    if (attempt >= 4) throw error;
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 500 * 2 ** attempt));
    return fetchJson(url, attempt + 1);
  } finally {
    clearTimeout(timeout);
  }
}

function pageUrl(page) {
  const query = new URLSearchParams({ maxPerPage: String(PAGE_SIZE) });
  query.append("filter[keywords][]", String(POLISH_COINS_KEYWORD_ID));
  query.append("filter[copyrights][]", String(PUBLIC_DOMAIN_ID));
  return `${API}/${page}?${query}`;
}

async function main() {
  const first = await fetchJson(pageUrl(1));
  const details = first?.data?.paginatorDetails;
  if (!details || Number(details.totalItemsCount) < 7_000) {
    throw new Error("MNW rights/query gate returned an unexpectedly small catalogue");
  }
  const pageCount = Number(details.totalPagesCount);
  const remaining = await Promise.all(
    Array.from({ length: Math.max(0, pageCount - 1) }, (_, index) => fetchJson(pageUrl(index + 2))),
  );
  const sourceItems = [first, ...remaining].flatMap((page) => page?.data?.items || []);
  const records = [...new Map(sourceItems.map(makeRecord).filter(Boolean).map((record) => [record.id, record])).values()];
  const stats = {
    publicDomainPolishCoinObjects: Number(details.totalItemsCount),
    acceptedCoinRecords: records.length,
    rejectedWithoutRecognizedNominal: sourceItems.length - records.length,
    withRuler: records.filter((record) => record.ruler).length,
    withYear: records.filter((record) => record.year).length,
    withMint: records.filter((record) => record.mint).length,
    withMintmasterOrManager: records.filter((record) => record.diagnosticMarkers.some((item) => item.startsWith("zarządca-mennicy:"))).length,
    withOpenImage: records.filter((record) => record.images.length).length,
  };
  const catalog = {
    version: "mnw-polish-public-domain-v1",
    generatedAt: new Date().toISOString(),
    scope: "Podstawowa identyfikacja polskich monet z Cyfrowego MNW, ograniczona filtrem DOMENA PUBLICZNA.",
    policy: {
      stage: "stage1-basic-identity",
      descriptionsCopied: false,
      publicDomainFilterRequired: true,
      sourceFactsOnly: true,
      variantsDeferred: true,
    },
    stats,
    records,
  };
  await mkdir(dirname(OUTPUT), { recursive: true });
  await writeFile(OUTPUT, gzipSync(`${JSON.stringify(catalog)}\n`, { level: 9 }));
  console.log(JSON.stringify(stats, null, 2));
  console.log(`[MNW] zapisano ${OUTPUT}`);
}

await main();
