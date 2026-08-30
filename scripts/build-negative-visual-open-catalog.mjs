#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BUILD_DIR = resolve(ROOT, "data/recognition/build");
const CACHE = resolve(BUILD_DIR, "commons-negative-visual-files-v1.json");
const OUTPUT = resolve(ROOT, "data/recognition/negative-visual-open-catalog-v1.json.gz");
const COMMONS_API = "https://commons.wikimedia.org/w/api.php";
const RETRIEVED_AT = new Date().toISOString().slice(0, 10);
const REFRESH = process.argv.includes("--refresh");
const REQUEST_GAP_MS = 1_500;

// These categories label the object or manufacturing aid explicitly. Their
// files are a negative visual reference set, never positive coin identities.
const CATEGORIES = [
  { title: "Category:Counterfeit coins", class: "counterfeit" },
  { title: "Category:Replica coins", class: "replica" },
  { title: "Category:Coin moulds", class: "coin-mould" },
];

const OPEN_LICENSES = new Set([
  "cc0",
  "cc by 1 0",
  "cc by 2 0",
  "cc by 2 5",
  "cc by 3 0",
  "cc by 4 0",
  "cc by sa 1 0",
  "cc by sa 2 0",
  "cc by sa 2 5",
  "cc by sa 3 0",
  "cc by sa 4 0",
  "public domain",
  "pd",
  "pdm",
  "pdm 1 0",
]);

const COIN_RELEVANCE = /\b(?:coin|counterfeit|fake|falsk\w*|forger\w*|monnaie|moneta|munze|mynter|kovanec|moeda|money|mint|ruble|rouble|rupee|dollar|penny|cent|nickel|franc|grosz|zlot\w*|ducat|denar|token)\b/;

const sleep = (milliseconds) => new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds));

function clean(value) {
  return String(value ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
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

function sideFrom(title) {
  const value = normalized(title.replace(/\.[a-z0-9]{2,5}$/i, ""));
  if (/\b(?:awers|avers|obverse|front|1 of 2)\b$/.test(value)) return "obverse";
  if (/\b(?:rewers|revers|reverse|back|2 of 2)\b$/.test(value)) return "reverse";
  return "combined-or-unknown";
}

function specimenGroup(title) {
  return normalized(title.replace(/\.[a-z0-9]{2,5}$/i, ""))
    .replace(/\b(?:awers|avers|obverse|front|rewers|revers|reverse|back|1 of 2|2 of 2)\b$/g, "")
    .trim();
}

function mechanismHints(title, categoryClass) {
  const value = normalized(title);
  const hints = new Set();
  if (categoryClass === "replica" || /\b(?:replica|replika|copy|kopia)\b/.test(value)) hints.add("declared-replica-or-copy");
  if (categoryClass === "coin-mould" || /\b(?:mould|mold|forma|cast|casting|odle)\b/.test(value)) hints.add("casting-or-mould-reference");
  if (/\b(?:counterstamped|counterstruck|altered|przerob)\b/.test(value)) hints.add("possible-alteration-reference");
  if (categoryClass === "counterfeit") hints.add("source-labelled-counterfeit");
  return [...hints];
}

async function readJson(path, fallback) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    return fallback;
  }
}

async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

let lastRequestAt = 0;
async function fetchJson(params, attempt = 1) {
  const wait = Math.max(0, REQUEST_GAP_MS - (Date.now() - lastRequestAt));
  if (wait) await sleep(wait);
  lastRequestAt = Date.now();
  const url = `${COMMONS_API}?${new URLSearchParams({
    format: "json",
    formatversion: "2",
    maxlag: "5",
    origin: "*",
    ...params,
  })}`;
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "APOMONET-negative-visual-catalog/1.0 (item-level rights audit)",
    },
  });
  const text = await response.text();
  const data = text.startsWith("{") ? JSON.parse(text) : null;
  if (!response.ok || !data || data.error) {
    if (attempt >= 6) throw new Error(data?.error?.info || clean(text).slice(0, 180) || `HTTP ${response.status}`);
    await sleep(Math.min(45_000, 2_000 * 2 ** (attempt - 1)));
    return fetchJson(params, attempt + 1);
  }
  return data;
}

function recordFromPage(page, category) {
  const info = page.imageinfo?.[0];
  const metadata = info?.extmetadata || {};
  const license = clean(metadata.LicenseShortName?.value || metadata.UsageTerms?.value);
  if (!info?.url || !/^image\//i.test(clean(info.mime)) || !OPEN_LICENSES.has(normalized(license))) return null;
  const title = clean(page.title).replace(/^File:/i, "");
  const relevanceText = normalized([
    title,
    metadata.ImageDescription?.value,
    metadata.ObjectName?.value,
    metadata.Categories?.value,
  ].join(" "));
  if (category.class === "counterfeit" && !COIN_RELEVANCE.test(relevanceText)) return null;
  const pageUrl = clean(info.descriptionurl);
  const id = createHash("sha1").update(pageUrl || info.url).digest("hex").slice(0, 20);
  return {
    id: `commons-negative:${id}`,
    title,
    negativeClass: category.class,
    sourceLabelStatus: "category-labelled-negative",
    notForPositiveIdentification: true,
    side: sideFrom(title),
    specimenGroup: specimenGroup(title),
    mechanismHints: mechanismHints(title, category.class),
    image: {
      url: info.url,
      width: Number(info.width) || null,
      height: Number(info.height) || null,
      mime: clean(info.mime),
      filePageUrl: pageUrl,
      license,
      licenseUrl: clean(metadata.LicenseUrl?.value),
      creator: clean(metadata.Artist?.value),
      credit: clean(metadata.Credit?.value),
      attributionRequired: !/^(?:cc0|pd|pdm|public domain)$/i.test(normalized(license)),
    },
    source: {
      type: "open-negative-image-reference",
      name: "Wikimedia Commons",
      category: category.title,
      url: pageUrl,
      rights: license,
      rightsCode: "explicit-open-license",
      restricted: false,
      retrievedAt: RETRIEVED_AT,
    },
  };
}

async function categoryRecords(category) {
  const records = [];
  let continuation = {};
  do {
    const data = await fetchJson({
      action: "query",
      generator: "categorymembers",
      gcmtitle: category.title,
      gcmtype: "file",
      gcmlimit: "500",
      prop: "imageinfo",
      iiprop: "url|size|mime|extmetadata",
      ...continuation,
    });
    for (const page of data.query?.pages || []) {
      const record = recordFromPage(page, category);
      if (record) records.push(record);
    }
    continuation = data.continue || {};
  } while (continuation.gcmcontinue);
  console.log(`[negative-commons] ${category.title}: ${records.length} legalnych obrazów`);
  return records;
}

async function discoverRecords() {
  if (!REFRESH) {
    const cached = await readJson(CACHE, null);
    if (cached?.records?.length) {
      console.log(`[negative-commons] cache: ${cached.records.length} rekordów`);
      return cached;
    }
  }
  const records = [];
  for (const category of CATEGORIES) records.push(...(await categoryRecords(category)));
  const unique = [...new Map(records.map((record) => [record.image.filePageUrl, record])).values()]
    .sort((left, right) => left.negativeClass.localeCompare(right.negativeClass) || left.title.localeCompare(right.title));
  const result = { schemaVersion: 1, retrievedAt: RETRIEVED_AT, records: unique };
  await writeJson(CACHE, result);
  return result;
}

const discovered = await discoverRecords();
const records = discovered.records;
const groups = new Map();
for (const record of records) {
  const key = `${record.negativeClass}|${record.specimenGroup}`;
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(record);
}
const pairedGroups = [...groups.values()].filter((group) =>
  group.some((record) => record.side === "obverse") && group.some((record) => record.side === "reverse")
).length;

const catalog = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  policy: {
    purpose: "visual-negative-reference-only",
    positiveIdentificationAllowed: false,
    authenticityVerdictAllowed: false,
    interpretation: "A source label provides a negative example, not proof that an arbitrary user coin is false.",
    itemLevelRightsRequired: true,
    commercialUseBlockedLicenses: ["CC BY-NC", "CC BY-NC-SA", "CC BY-NC-ND"],
    mediaDownloaded: false,
  },
  stats: {
    records: records.length,
    pairedGroups,
    byClass: Object.fromEntries(CATEGORIES.map((category) => [
      category.class,
      records.filter((record) => record.negativeClass === category.class).length,
    ])),
    attributionRequired: records.filter((record) => record.image.attributionRequired).length,
  },
  records,
};

await mkdir(dirname(OUTPUT), { recursive: true });
await writeFile(OUTPUT, gzipSync(`${JSON.stringify(catalog)}\n`, { level: 9 }));
console.log(JSON.stringify(catalog.stats, null, 2));
console.log(`[negative-commons] zapisano ${OUTPUT}`);
