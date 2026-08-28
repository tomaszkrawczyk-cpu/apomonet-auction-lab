#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync, gzipSync } from "node:zlib";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BUILD_DIR = resolve(ROOT, "data/recognition/build");
const CACHE = resolve(BUILD_DIR, "commons-historical-files-v1.json");
const MNK_CATALOG = resolve(ROOT, "data/recognition/mnk-polish-catalog-v1.json.gz");
const OUTPUT = resolve(ROOT, "data/recognition/historical-open-catalog-v1.json.gz");
const COMMONS_API = "https://commons.wikimedia.org/w/api.php";
const RETRIEVED_AT = new Date().toISOString().slice(0, 10);
const REFRESH = process.argv.includes("--refresh");
const REQUEST_GAP_MS = 6_500;

const CATEGORIES = [
  {
    title: "Category:Coins of Duchy of Warsaw (1810–1814)",
    region: "Księstwo Warszawskie",
    tokens: ["ksiestwo warszawskie", "fryderyk august"],
  },
  {
    title: "Category:Coins of Congress Poland (1815–1864)",
    region: "Królestwo Polskie",
    tokens: ["krolestwo polskie", "aleksander i", "mikolaj i"],
  },
  {
    title: "Category:Coins of Free City of Cracow (1835)",
    region: "Wolne Miasto Kraków",
    tokens: ["wolne miasto krakow", "krakow"],
  },
  {
    title: "Category:Coins of East and West Prussia (1772–1811)",
    region: "Prusy Wschodnie i Zachodnie",
    tokens: ["prusy", "fryderyk wilhelm"],
  },
  {
    title: "Category:Coins of Kingdom of Galicia and Lodomeria (1774–1794)",
    region: "Królestwo Galicji i Lodomerii",
    tokens: ["galicja", "lodomeria", "franciszek ii"],
  },
  {
    title: "Category:Coins of South Prussia (1796–1798)",
    region: "Prusy Południowe",
    tokens: ["prusy poludniowe", "fryderyk wilhelm ii"],
  },
  {
    title: "Category:Coins of the Free City of Danzig (Napoleonic)",
    region: "Wolne Miasto Gdańsk (epoka napoleońska)",
    tokens: ["gdansk", "danzig", "wolne miasto"],
  },
  {
    title: "Category:Coins of Grand Duchy of Posen (1816–1817)",
    region: "Wielkie Księstwo Poznańskie",
    tokens: ["wielkie ksiestwo poznanskie", "poznan"],
  },
  {
    title: "Category:Coins of Ober-Ost (1916)",
    region: "Ober-Ost",
    tokens: ["ober ost", "okupacja niemiecka"],
  },
  {
    title: "Category:Coins of Polish Kingdom (1917–1918)",
    region: "Królestwo Polskie 1917–1918",
    tokens: ["okupacja niemiecka", "krolestwo polskie"],
  },
  { title: "Category:1/2 Mark coins of the German Empire", region: "Zabór pruski — ½ marki", tokens: [] },
  { title: "Category:1 Mark coins of the German Empire", region: "Zabór pruski — 1 marka", tokens: [] },
  { title: "Category:2 Mark coins of the German Empire", region: "Zabór pruski — 2 marki", tokens: [] },
  { title: "Category:3 Mark coins of the German Empire", region: "Zabór pruski — 3 marki", tokens: [] },
  { title: "Category:5 Mark coins of the German Empire", region: "Zabór pruski — 5 marek", tokens: [] },
  { title: "Category:Półgrosze", region: "Półgrosze", tokens: [] },
  { title: "Category:Polish groschens", region: "Grosze polskie", tokens: [] },
  { title: "Category:Szelągi", region: "Szelągi", tokens: [] },
  { title: "Category:Trojaki", region: "Trojaki", tokens: [] },
  { title: "Category:Szóstaki", region: "Szóstaki", tokens: [] },
  { title: "Category:Polish thalers", region: "Półtalary polskie", tokens: [] },
  {
    title: "Category:Coins of Sigismund II Augustus",
    region: "Czworaki Zygmunta II Augusta",
    tokens: ["zygmunt ii august", "zygmunt august"],
    nominalAllowlist: ["4 grosze"],
  },
];

const OPEN_IMAGE_LICENSES = new Set([
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
]);

const FORBIDDEN = /\b(fals\w*|counterfeit|kopia|copy|replika|replica|nowe bicie|restrike|proba|proof|stempel lustrzany|odbitka|bicie xix|medal|zeton)\b/;
const sleep = (milliseconds) => new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds));

function clean(value) {
  return String(value ?? "").replace(/<[^>]+>/g, " ").replace(/&[^;]+;/g, " ").replace(/\s+/g, " ").trim();
}

function normalized(value) {
  return clean(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ł/g, "l")
    .replace(/[^a-z0-9½]+/g, " ")
    .trim();
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
      "User-Agent": "APOMONET-historical-open-catalog/1.0 (item-level rights audit)",
    },
  });
  const text = await response.text();
  const data = text.startsWith("{") ? JSON.parse(text) : null;
  if (!response.ok || !data || data.error) {
    if (attempt >= 7) throw new Error(data?.error?.info || clean(text).slice(0, 180) || `HTTP ${response.status}`);
    await sleep(Math.min(60_000, 4_000 * 2 ** (attempt - 1)));
    return fetchJson(params, attempt + 1);
  }
  return data;
}

function imageFromPage(page, category) {
  const info = page.imageinfo?.[0];
  const metadata = info?.extmetadata || {};
  const license = clean(metadata.LicenseShortName?.value || metadata.UsageTerms?.value);
  if (!info?.url || !OPEN_IMAGE_LICENSES.has(normalized(license))) return null;
  const title = clean(page.title).replace(/^File:/i, "");
  return {
    pageId: page.pageid,
    title,
    category: category.title,
    region: category.region,
    regionTokens: category.tokens,
    nominalAllowlist: category.nominalAllowlist || [],
    url: info.url,
    descriptionUrl: info.descriptionurl,
    license,
    licenseUrl: clean(metadata.LicenseUrl?.value),
    artist: clean(metadata.Artist?.value),
    credit: clean(metadata.Credit?.value),
  };
}

async function categoryImages(category) {
  const images = [];
  let continuation = {};
  do {
    const data = await fetchJson({
      action: "query",
      generator: "categorymembers",
      gcmtitle: category.title,
      gcmtype: "file",
      gcmlimit: "500",
      prop: "imageinfo",
      iiprop: "url|extmetadata",
      ...continuation,
    });
    for (const page of data.query?.pages || []) {
      const image = imageFromPage(page, category);
      if (image) images.push(image);
    }
    continuation = data.continue || {};
  } while (continuation.gcmcontinue);
  console.log(`[commons] ${category.title}: ${images.length} plików z otwartą licencją`);
  return images;
}

async function discoverImages() {
  if (!REFRESH) {
    const cached = await readJson(CACHE, null);
    if (cached?.images?.length) {
      console.log(`[commons] cache: ${cached.images.length} plików`);
      return cached;
    }
  }
  const images = [];
  for (const category of CATEGORIES) images.push(...(await categoryImages(category)));
  const result = { schemaVersion: 1, retrievedAt: RETRIEVED_AT, images };
  await writeJson(CACHE, result);
  return result;
}

function nominalFrom(value) {
  const text = normalized(value);
  if (/\b(pol grosza|polgrosz|½ grosz|1 2 grosz)/.test(text)) return "½ grosza";
  if (/\b(pol talara|poltalar|½ talar|1 2 talar)/.test(text)) return "½ talara";
  if (/\b(czworak|4 grosz)/.test(text)) return "4 grosze";
  if (/\b(szostak|6 grosz)/.test(text)) return "6 groszy";
  if (/\b(trojak|trojka|3 grosz)/.test(text)) return "3 grosze";
  const kopiejka = text.match(/\b(½|1|2|3|5|10|20|25)\s*(?:kopiej\w*|kopeken)\b/);
  if (kopiejka) {
    if (kopiejka[1] === "½") return "½ kopiejki";
    if (kopiejka[1] === "1") return "1 kopiejka";
    if (["2", "3"].includes(kopiejka[1])) return `${kopiejka[1]} kopiejki`;
    return `${kopiejka[1]} kopiejek`;
  }
  const fenig = text.match(/\b(1|5|10|20)\s*fenig\w*\b/);
  if (fenig) return fenig[1] === "1" ? "1 fenig" : `${fenig[1]} fenigów`;
  if (/\b(½|1 2)\s*mark\w*\b/.test(text)) return "½ marki";
  const marka = text.match(/\b(1|2|3|5|10|20)\s*mark\w*\b/);
  if (marka) return marka[1] === "1" ? "1 marka" : ["2", "3"].includes(marka[1]) ? `${marka[1]} marki` : `${marka[1]} marek`;
  const grosz = text.match(/\b(1|2|5|10|20|30|40)\s*grosz\w*\b/);
  if (grosz) return grosz[1] === "1" ? "1 grosz" : `${grosz[1]} groszy`;
  if (/\bgrosz\b/.test(text)) return "1 grosz";
  if (/\bszel[aą]g\w*\b/.test(text)) return "1 szeląg";
  return "";
}

function nominalKey(value) {
  const text = normalized(value)
    .replace(/\bpolgrosz\b/g, "½ grosza")
    .replace(/\bpoltalar\b/g, "½ talara")
    .replace(/\btrojak\b|\btrojka\b/g, "3 grosze")
    .replace(/\bczworak\b|\bczworka\b/g, "4 grosze")
    .replace(/\bszostak\b|\bszostka\b/g, "6 groszy");
  if (/\b½\s*grosz/.test(text)) return "½-grosz";
  if (/\b½\s*talar/.test(text)) return "½-talar";
  const match = text.match(/\b(½|\d+)\s*(grosz|szelag|kopiej|fenig|mark|talar)/);
  if (match) return `${match[1]}-${match[2]}`;
  if (/\bgrosz\b/.test(text)) return "1-grosz";
  if (/\bszelag\b/.test(text)) return "1-szelag";
  return "";
}

function yearFrom(value) {
  return normalized(value).match(/\b(1[0-9]{3}|20[0-2][0-9])\b/)?.[1] || "";
}

function sideFrom(value) {
  const text = normalized(value.replace(/\.[a-z0-9]{2,5}$/i, ""));
  if (/\b(awers|avers|obverse|01)\b$/.test(text)) return "obverse";
  if (/\b(rewers|revers|reverse|02)\b$/.test(text)) return "reverse";
  return "combined";
}

function groupKey(image) {
  return normalized(image.title.replace(/\.[a-z0-9]{2,5}$/i, ""))
    .replace(/\b(awers|avers|obverse|rewers|revers|reverse|01|02)\b$/g, "")
    .trim();
}

function meaningfulTokens(value) {
  const ignored = new Set(["grosz", "grosze", "groszy", "szelag", "kopiejka", "kopiejki", "kopiejek", "fenig", "fenigow", "marka", "marki", "talar", "talara", "awers", "rewers", "polska", "moneta", "file", "jpg", "jpeg", "png"]);
  return normalized(value).split(" ").filter((token) => token.length >= 2 && !/^\d+$/.test(token) && !ignored.has(token));
}

function candidateText(record) {
  return normalized(`${record.title} ${record.country} ${record.ruler} ${record.mint} ${record.period}`);
}

function matchRecord(group, records) {
  const sample = group[0];
  const title = group.map((image) => image.title).join(" ");
  if (FORBIDDEN.test(normalized(title))) return null;
  const year = yearFrom(title);
  const nominal = nominalFrom(title);
  const key = nominalKey(nominal);
  if (!year || !key) return null;
  if (sample.nominalAllowlist.length && !sample.nominalAllowlist.some((value) => nominalKey(value) === key)) return null;
  let candidates = records.filter((record) => record.year === year && nominalKey(record.nominal) === key);
  if (!candidates.length) return null;
  if (sample.regionTokens.length) {
    const regional = candidates.filter((record) => sample.regionTokens.some((token) => candidateText(record).includes(token)));
    if (regional.length) candidates = regional;
    else if (candidates.length > 1) return null;
  }
  if (candidates.length === 1) return { record: candidates[0], year, nominal, confidence: "exact-year-nominal-region" };
  const tokens = meaningfulTokens(title);
  const ranked = candidates.map((record) => ({
    record,
    score: tokens.filter((token) => candidateText(record).includes(token)).length,
  })).sort((a, b) => b.score - a.score || a.record.id.localeCompare(b.record.id));
  if (ranked[0].score < 1 || ranked[0].score < (ranked[1]?.score || 0) + 2) return null;
  return { record: ranked[0].record, year, nominal, confidence: "exact-year-nominal-region-and-title-tokens" };
}

function rightsFor(image) {
  return {
    imageUrl: image.url,
    filePageUrl: image.descriptionUrl,
    license: image.license,
    licenseUrl: image.licenseUrl,
    creator: image.artist,
    credit: image.credit,
    retrievedAt: RETRIEVED_AT,
  };
}

function buildEnrichments(images, records) {
  const groups = new Map();
  for (const image of images) {
    const key = `${image.category}|${groupKey(image)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(image);
  }
  const bestByRecord = new Map();
  let rejectedForbidden = 0;
  let rejectedAmbiguous = 0;
  for (const group of groups.values()) {
    if (FORBIDDEN.test(normalized(group.map((image) => image.title).join(" ")))) {
      rejectedForbidden += 1;
      continue;
    }
    const match = matchRecord(group, records);
    if (!match) {
      rejectedAmbiguous += 1;
      continue;
    }
    const sideOrder = { obverse: 0, reverse: 1, combined: 2 };
    const selected = [...group]
      .sort((a, b) => sideOrder[sideFrom(a.title)] - sideOrder[sideFrom(b.title)] || a.pageId - b.pageId)
      .filter((image, index, all) => all.findIndex((other) => other.url === image.url) === index)
      .slice(0, 2);
    const enrichment = {
      targetId: match.record.id,
      title: match.record.title,
      year: match.year,
      nominal: match.nominal,
      region: group[0].region,
      category: group[0].category,
      matchConfidence: match.confidence,
      images: selected.map((image) => image.url),
      imageRights: selected.map(rightsFor),
    };
    const previous = bestByRecord.get(match.record.id);
    if (!previous || enrichment.images.length > previous.images.length) bestByRecord.set(match.record.id, enrichment);
  }
  return {
    enrichments: [...bestByRecord.values()].sort((a, b) => a.targetId.localeCompare(b.targetId)),
    groupsReviewed: groups.size,
    rejectedForbidden,
    rejectedAmbiguous,
  };
}

async function main() {
  const mnk = JSON.parse(gunzipSync(await readFile(MNK_CATALOG)).toString("utf8"));
  const commons = await discoverImages();
  const built = buildEnrichments(commons.images, mnk.records);
  const withPairs = built.enrichments.filter((item) => item.images.length >= 2).length;
  const byRegion = {};
  for (const item of built.enrichments) byRegion[item.region] = (byRegion[item.region] || 0) + 1;
  const output = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    source: {
      name: "Wikimedia Commons — otwarte fotografie historycznych monet polskich i ziem polskich",
      url: "https://commons.wikimedia.org/wiki/Category:Coins_of_Poland",
      rightsGate: "Wyłącznie pliki z kompatybilną licencją CC/CC BY/CC BY-SA lub oznaczeniem public domain, sprawdzoną w metadanych konkretnego pliku",
    },
    categories: CATEGORIES.map((category) => category.title),
    records: [],
    enrichments: built.enrichments,
    stats: {
      licensedFilesReviewed: commons.images.length,
      imageGroupsReviewed: built.groupsReviewed,
      matchedMuseumTypes: built.enrichments.length,
      matchedWithTwoSideImages: withPairs,
      rejectedForbidden: built.rejectedForbidden,
      rejectedAmbiguousOrIncomplete: built.rejectedAmbiguous,
      byRegion,
    },
  };
  await mkdir(dirname(OUTPUT), { recursive: true });
  await writeFile(OUTPUT, gzipSync(`${JSON.stringify(output)}\n`, { level: 9 }));
  console.log(`[done] ${output.stats.matchedMuseumTypes} typów wzbogaconych; ${withPairs} z parą stron`);
  console.log(JSON.stringify(output.stats, null, 2));
}

main().catch((error) => {
  console.error(error?.stack || error);
  process.exitCode = 1;
});
