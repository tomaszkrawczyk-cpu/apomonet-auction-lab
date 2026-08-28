#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BUILD_DIR = resolve(ROOT, "data/recognition/build");
const CACHE = resolve(BUILD_DIR, "prl-open-pages-v1.json");
const OUTPUT = resolve(ROOT, "data/recognition/prl-open-catalog-v1.json.gz");
const WIKI_API = "https://pl.wikipedia.org/w/api.php";
const COMMONS_API = "https://commons.wikimedia.org/w/api.php";
const RETRIEVED_AT = new Date().toISOString().slice(0, 10);
const REFRESH = process.argv.includes("--refresh");
const REQUEST_GAP_MS = 6_500;

const ROOT_CATEGORIES = [
  "Kategoria:Monety obiegowe PRL (1949–1990)",
  "Kategoria:Monety okolicznościowe PRL (1964–1989)",
  "Kategoria:Monety kolekcjonerskie PRL (1972–1989)",
];

const AGGREGATE_PAGES = [
  "Monety próbne kolekcjonerskie (1964–1991)",
  "Monety próbne mosiężne (seria monet)",
  "Monety próbne niklowe (seria monet)",
];

const OPEN_IMAGE_LICENSES = new Set([
  "cc0",
  "cc by 1.0",
  "cc by 2.0",
  "cc by 2.5",
  "cc by 3.0",
  "cc by 4.0",
  "cc by-sa 1.0",
  "cc by-sa 2.0",
  "cc by-sa 2.5",
  "cc by-sa 3.0",
  "cc by-sa 4.0",
  "public domain",
  "pd",
].map(normalized));

const sleep = (milliseconds) => new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds));

function clean(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
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

function stableId(value) {
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}

let lastRequestAt = 0;
async function fetchJson(baseUrl, params, attempt = 1) {
  const wait = Math.max(0, REQUEST_GAP_MS - (Date.now() - lastRequestAt));
  if (wait) await sleep(wait);
  lastRequestAt = Date.now();
  const url = `${baseUrl}?${new URLSearchParams({
    format: "json",
    formatversion: "2",
    maxlag: "5",
    origin: "*",
    ...params,
  })}`;
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "APOMONET-open-catalog/1.0 (source-provenance builder)",
    },
  });
  const text = await response.text();
  const data = text.startsWith("{") ? JSON.parse(text) : null;
  if (!response.ok || !data || data.error) {
    if (attempt >= 7) {
      throw new Error(data?.error?.info || clean(text).slice(0, 180) || `HTTP ${response.status}`);
    }
    await sleep(Math.min(60_000, 4_000 * 2 ** (attempt - 1)));
    return fetchJson(baseUrl, params, attempt + 1);
  }
  return data;
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

async function categoryMembers(category) {
  const members = [];
  let continuation = "";
  do {
    const params = {
      action: "query",
      list: "categorymembers",
      cmtitle: category,
      cmtype: "page|subcat",
      cmlimit: "500",
    };
    if (continuation) params.cmcontinue = continuation;
    const data = await fetchJson(WIKI_API, params);
    members.push(...(data.query?.categorymembers || []));
    continuation = data.continue?.cmcontinue || "";
  } while (continuation);
  return members;
}

async function discoverPages() {
  const queue = [...ROOT_CATEGORIES];
  const categories = new Set();
  const pages = new Map();
  while (queue.length) {
    const category = queue.shift();
    if (categories.has(category)) continue;
    categories.add(category);
    const members = await categoryMembers(category);
    for (const member of members) {
      if (member.ns === 14) queue.push(member.title);
      if (member.ns === 0) pages.set(member.pageid, member.title);
    }
    console.log(`[discover] ${category}: ${members.length} pozycji; ${pages.size} stron monet`);
  }
  for (const title of AGGREGATE_PAGES) pages.set(`title:${title}`, title);
  return { categories: [...categories], pages: [...pages.values()].sort((a, b) => a.localeCompare(b, "pl")) };
}

async function fetchWikitextPages(titles) {
  const pages = [];
  const batches = [];
  for (let index = 0; index < titles.length; index += 40) batches.push(titles.slice(index, index + 40));
  for (let index = 0; index < batches.length; index += 1) {
    const data = await fetchJson(WIKI_API, {
      action: "query",
      prop: "revisions",
      titles: batches[index].join("|"),
      redirects: "1",
      rvprop: "ids|timestamp|content",
      rvslots: "main",
    });
    for (const page of data.query?.pages || []) {
      const revision = page.revisions?.[0] || {};
      const wikitext = revision.slots?.main?.content || revision.content || "";
      if (!page.missing && wikitext) {
        pages.push({
          pageid: page.pageid,
          title: page.title,
          revisionId: revision.revid,
          revisionTimestamp: revision.timestamp,
          wikitext,
        });
      }
    }
    console.log(`[pages] pakiet ${index + 1}/${batches.length}: łącznie ${pages.length}`);
  }
  return pages;
}

async function fetchCommonsImages() {
  const data = await fetchJson(COMMONS_API, {
    action: "query",
    generator: "categorymembers",
    gcmtitle: "Category:Coins of the Polish People's Republic (1949–1994)",
    gcmtype: "file",
    gcmlimit: "100",
    prop: "imageinfo",
    iiprop: "url|extmetadata",
  });
  return (data.query?.pages || []).flatMap((page) => {
    const info = page.imageinfo?.[0];
    if (!info?.url) return [];
    const metadata = info.extmetadata || {};
    const license = clean(metadata.LicenseShortName?.value || metadata.UsageTerms?.value);
    if (!OPEN_IMAGE_LICENSES.has(normalized(license))) return [];
    return [{
      title: page.title.replace(/^File:/i, ""),
      url: info.url,
      descriptionUrl: info.descriptionurl,
      license,
      licenseUrl: clean(metadata.LicenseUrl?.value),
      artist: clean(metadata.Artist?.value).replace(/<[^>]+>/g, " ").replace(/&[^;]+;/g, " "),
      credit: clean(metadata.Credit?.value).replace(/<[^>]+>/g, " ").replace(/&[^;]+;/g, " "),
    }];
  });
}

function balancedTemplate(wikitext, name) {
  const start = wikitext.toLowerCase().indexOf(`{{${name.toLowerCase()}`);
  if (start < 0) return "";
  let depth = 0;
  for (let index = start; index < wikitext.length - 1; index += 1) {
    const pair = wikitext.slice(index, index + 2);
    if (pair === "{{") {
      depth += 1;
      index += 1;
    } else if (pair === "}}") {
      depth -= 1;
      index += 1;
      if (depth === 0) return wikitext.slice(start, index + 1);
    }
  }
  return "";
}

function templateFields(template) {
  if (!template) return {};
  const fields = {};
  let activeKey = "";
  for (const line of template.split(/\r?\n/).slice(1, -1)) {
    const match = line.match(/^\s*\|\s*([^=]+?)\s*=\s*(.*)$/);
    if (match) {
      activeKey = normalized(match[1]);
      fields[activeKey] = match[2];
    } else if (activeKey) {
      fields[activeKey] += ` ${line}`;
    }
  }
  return fields;
}

function plainWikitext(value) {
  let text = String(value ?? "");
  text = text.replace(/<ref\b[^>]*>[\s\S]*?<\/ref>/gi, " ").replace(/<ref\b[^>]*\/>/gi, " ");
  text = text.replace(/<br\s*\/?>/gi, " / ");
  for (let iteration = 0; iteration < 5; iteration += 1) {
    text = text.replace(/{{(?:nowrap|formatnum|small|nobr)\|([^{}]*)}}/gi, "$1");
    text = text.replace(/{{[^{}]*}}/g, " ");
  }
  text = text.replace(/\[\[[^\]|]+\|([^\]]+)]]/g, "$1").replace(/\[\[([^\]]+)]]/g, "$1");
  text = text.replace(/'{2,}/g, "").replace(/<[^>]+>/g, " ").replace(/&nbsp;|&#160;/gi, " ");
  return clean(text);
}

function numberFrom(value) {
  const match = plainWikitext(value).match(/\d+(?:[.,]\d+)?/);
  return match ? Number(match[0].replace(",", ".")) : null;
}

function yearsFrom(value, fallbackTitle) {
  const raw = plainWikitext(value);
  const years = new Set();
  for (const match of raw.matchAll(/\b(19[4-8]\d)\s*[–—-]\s*(19[4-8]\d)\b/g)) {
    const start = Number(match[1]);
    const end = Number(match[2]);
    if (end >= start && end - start <= 50) for (let year = start; year <= end; year += 1) years.add(year);
  }
  for (const match of raw.matchAll(/\b(19[4-8]\d)\b/g)) years.add(Number(match[1]));
  if (!years.size) {
    const fallback = clean(fallbackTitle).match(/\b(19[4-8]\d)\b/);
    if (fallback) years.add(Number(fallback[1]));
  }
  return [...years].filter((year) => year >= 1949 && year <= 1989).sort((a, b) => a - b);
}

function section(wikitext, heading) {
  const match = wikitext.match(new RegExp(`\\n==\\s*${heading}\\s*==([\\s\\S]*?)(?=\\n==[^=]|$)`, "i"));
  return match?.[1] || "";
}

function legendsFrom(sectionText) {
  const values = [];
  for (const match of sectionText.matchAll(/[„“\"]([^””\"]{2,140})[””\"]/g)) {
    const text = plainWikitext(match[1]);
    if (text && !values.includes(text)) values.push(text);
  }
  return values.slice(0, 6).join(" · ");
}

function legalReferences(wikitext) {
  const result = [];
  const patterns = [
    { regex: /{{\s*Monitor Polski\s*\|\s*(\d{4})\s*\|\s*(\d+)\s*\|\s*(\d+)\s*}}/gi, series: "MP" },
    { regex: /{{\s*Dziennik Ustaw\s*\|\s*(\d{4})\s*\|\s*(\d+)\s*\|\s*(\d+)\s*}}/gi, series: "DU" },
  ];
  for (const { regex, series } of patterns) {
    for (const match of wikitext.matchAll(regex)) {
      const year = match[1];
      const issue = match[2];
      const position = match[3];
      const id = `${series} ${year} nr ${issue} poz. ${position}`;
      if (!result.some((item) => item.id === id)) {
        result.push({ id, url: `https://eli.gov.pl/eli/${series}/${year}/${position}/ogl` });
      }
    }
  }
  return result;
}

function coinClass(fields, title) {
  const value = normalized(`${fields["typ monety"] || ""} ${title}`);
  if (value.includes("probna")) return "pattern";
  if (value.includes("kolekcjonerska")) return "collector";
  if (value.includes("okolicznosciowa")) return "commemorative";
  return "circulation";
}

function subjectFrom(title, nominal, years) {
  let value = clean(title)
    .replace(/\bwz[oó]r\s*(?:19[4-8]\d)\b/gi, " ")
    .replace(/\b(19[4-8]\d)\b/g, " ")
    .replace(/^\s*\d[\d\s]*(?:[.,]\d+)?\s*(?:złotych|złote|złoty|zł|groszy|grosze|grosz|gr)\s*/i, "")
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .replace(/\b(?:wz[oó]r)\b/gi, " ")
    .replace(/^[\s/–—-]+|[\s/–—-]+$/g, "");
  if (years.length > 1 && !value) value = "typ obiegowy";
  return clean(value);
}

function variantParts(value) {
  return plainWikitext(value).split(/\s+\/\s+/).map(clean).filter(Boolean);
}

function variantSpecs(fields) {
  const metals = variantParts(fields["materiał"] || fields.material);
  const weights = variantParts(fields.masa);
  const mints = variantParts(fields.mennica);
  const edges = variantParts(fields.rant);
  const dates = variantParts(fields["data emisji"]);
  const count = Math.max(metals.length, weights.length);
  if (count <= 1 || metals.length !== weights.length) {
    return [{
      metal: metals.join(" / "),
      weightGrams: numberFrom(fields.masa),
      mint: mints.join(" / ") || "Mennica Państwowa, Warszawa",
      edge: edges.join(" / "),
      issueDate: dates.join(" / "),
      variantCount: 1,
    }];
  }
  return Array.from({ length: count }, (_, index) => ({
    metal: clean(metals[index].replace(/\s*\([A-Za-z]+\)\s*$/g, "")),
    weightGrams: numberFrom(weights[index]),
    mint: mints.length === count ? mints[index] : mints.join(" / ") || "Mennica Państwowa, Warszawa",
    edge: edges.length === count ? edges[index] : edges.join(" / "),
    issueDate: dates.length === count ? dates[index] : dates.join(" / "),
    variantCount: count,
  }));
}

function normalizedNominal(value, title) {
  const raw = plainWikitext(value) || clean(title).match(/^\d+(?:[.,]\d+)?\s*(?:złot(?:y|e|ych)|grosz(?:y|e)?)/i)?.[0] || "";
  return clean(raw.replace(/złot(?:ych|y|e)/gi, "zł").replace(/grosz(?:y|e)?/gi, "gr"));
}

function pageRecords(page) {
  const fields = templateFields(balancedTemplate(page.wikitext, "Moneta infobox"));
  if (!Object.keys(fields).length) return [];
  const nominal = normalizedNominal(fields.nominal, page.title);
  const years = yearsFrom(fields.rocznik, page.title);
  if (!nominal || !years.length || nominal.includes("/")) return [];
  const titleBase = plainWikitext(fields.nazwa) || page.title;
  const coinClassValue = coinClass(fields, titleBase);
  const subject = subjectFrom(titleBase, nominal, years);
  const variants = variantSpecs(fields);
  const diameter = numberFrom(fields["średnica"] || fields.srednica);
  const mintage = plainWikitext(fields["nakład"] || fields.naklad);
  const designer = plainWikitext(fields.projektant);
  const obverseLegend = legendsFrom(section(page.wikitext, "Awers"));
  const reverseLegend = legendsFrom(section(page.wikitext, "Rewers"));
  const legal = legalReferences(page.wikitext);
  const sourceUrl = `https://pl.wikipedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, "_"))}`;
  return years.flatMap((year) => variants.map((variant, variantIndex) => ({
    id: `prl-open:${stableId(`${page.pageid}|${year}|${nominal}|${coinClassValue}|${variant.metal}|${variantIndex}`)}`,
    title: [nominal, year, subject, variants.length > 1 ? variant.metal : ""].filter(Boolean).join(" — "),
    objectKind: coinClassValue === "pattern" ? "pattern" : "coin",
    coinClass: coinClassValue,
    country: "Polska",
    ruler: "Narodowy Bank Polski",
    year: String(year),
    yearRange: [year, year],
    yearVariants: years,
    period: "people-republic",
    nominal,
    metal: variant.metal,
    mint: variant.mint,
    shape: "round",
    weightGrams: variant.weightGrams,
    diameterMm: diameter,
    edge: variant.edge,
    variantCount: variant.variantCount,
    mintage,
    issueDate: variant.issueDate,
    designer,
    portrait: subject,
    obverseLegend,
    reverseLegend,
    diagnosticMarkers: [
      subject,
      coinClassValue === "pattern" ? "napis PRÓBA" : "",
      nominal,
      variant.metal,
      variant.edge ? `rant: ${variant.edge}` : "",
      designer ? `projektant: ${designer}` : "",
    ].filter(Boolean),
    images: [],
    imageRights: [],
    legalReferences: legal,
    source: {
      type: "open-reference-with-official-provenance",
      name: "Wikipedia (PL) — fakty katalogowe zweryfikowane odsyłaczami do ELI/ISAP",
      recordId: `pageid:${page.pageid}; revid:${page.revisionId}; year:${year}; variant:${variantIndex + 1}`,
      pageId: `pageid:${page.pageid}; revid:${page.revisionId}`,
      url: sourceUrl,
      retrievedAt: RETRIEVED_AT,
      rights: "CC BY-SA 4.0; w APOMONET zapisano wyłącznie znormalizowane fakty i historyczne napisy, bez kopiowania opisów i zdjęć strony",
      rightsCode: "explicit-open-license",
      restricted: false,
      accessMode: "revision-pinned-facts-with-official-legal-references",
      revisionTimestamp: page.revisionTimestamp,
      legalReferences: legal,
    },
  })));
}

function nominalKey(value) {
  const match = normalized(value).match(/\b(\d+)\s*(zl|gr)/);
  return match ? `${match[1]}-${match[2]}` : "";
}

function imageMatchScore(image, record) {
  const imageText = normalized(image.title);
  const isPatternImage = /\bproba\b/.test(imageText);
  if (isPatternImage !== (record.objectKind === "pattern")) return -1;
  if (!imageText.includes(record.year)) return -1;
  const key = nominalKey(record.nominal);
  if (key) {
    const [amount, unit] = key.split("-");
    const unitPattern = unit === "zl" ? "(?:zl|zlot)" : "(?:gr|grosz)";
    if (!new RegExp(`\\b${amount}\\s*${unitPattern}`).test(imageText)) return -1;
  }
  const materialHint = imageText.match(/\b(al|aluminium|cuni|braz|mosiadz|nikiel)\b/)?.[1] || "";
  if (record.variantCount > 1 && !materialHint) return -1;
  if (materialHint === "al" || materialHint === "aluminium") {
    if (!/\b(alupolon|aluminium)\b/.test(normalized(record.metal))) return -1;
  } else if (materialHint === "cuni") {
    if (!normalized(record.metal).includes("miedzionikiel")) return -1;
  } else if (materialHint === "braz") {
    if (!normalized(record.metal).includes("braz")) return -1;
  } else if (materialHint === "mosiadz" || materialHint === "nikiel") {
    if (!normalized(record.metal).includes(materialHint)) return -1;
  }
  const ignored = new Set(["awers", "avers", "rewers", "revers", "jpg", "jpeg", "png", "moneta", "pol", "rok"]);
  const recordTokens = normalized(`${record.title} ${record.portrait}`).split(" ").filter((token) => token.length >= 4 && !ignored.has(token));
  const matches = recordTokens.filter((token) => imageText.includes(token));
  return 10 + matches.length * 4;
}

function attachImages(records, images) {
  for (const image of images) {
    const ranked = records
      .map((record) => ({ record, score: imageMatchScore(image, record) }))
      .filter((item) => item.score >= 10)
      .sort((a, b) => b.score - a.score);
    if (!ranked.length) continue;
    const record = ranked[0].record;
    if (!record.images.includes(image.url)) record.images.push(image.url);
    record.imageRights.push({
      url: image.url,
      sourceUrl: image.descriptionUrl,
      license: image.license,
      licenseUrl: image.licenseUrl,
      attribution: image.artist || image.credit,
    });
  }
}

function deduplicate(records) {
  const byKey = new Map();
  for (const record of records) {
    const key = normalized(`${record.coinClass}|${record.nominal}|${record.year}|${record.portrait}|${record.metal}|${record.weightGrams}|${record.diameterMm}`);
    const previous = byKey.get(key);
    if (!previous) {
      byKey.set(key, record);
      continue;
    }
    previous.legalReferences = [...previous.legalReferences, ...record.legalReferences].filter(
      (item, index, array) => array.findIndex((candidate) => candidate.id === item.id) === index,
    );
    previous.source.legalReferences = previous.legalReferences;
  }
  return [...byKey.values()].sort((a, b) => Number(a.year) - Number(b.year) || a.nominal.localeCompare(b.nominal, "pl") || a.title.localeCompare(b.title, "pl"));
}

async function main() {
  let raw = !REFRESH && (await readJson(CACHE, null));
  if (!raw?.pages?.length) {
    const discovery = await discoverPages();
    const pages = await fetchWikitextPages(discovery.pages);
    const images = await fetchCommonsImages();
    raw = { schemaVersion: 1, retrievedAt: RETRIEVED_AT, ...discovery, pages, images };
    await writeJson(CACHE, raw);
  } else {
    console.log(`[cache] ${raw.pages.length} stron; ${raw.images?.length || 0} obrazów Commons`);
    if ((raw.images?.length || 0) < 10) {
      raw.images = await fetchCommonsImages();
      await writeJson(CACHE, raw);
      console.log(`[images] odświeżono: ${raw.images.length} plików z prawami na poziomie obiektu`);
    }
  }

  const rawRecords = raw.pages.flatMap(pageRecords);
  const records = deduplicate(rawRecords);
  attachImages(records, raw.images || []);
  const stats = {
    sourcePages: raw.pages.length,
    sourceCategories: raw.categories.length,
    records: records.length,
    uniqueTypes: new Set(records.map((record) => record.source.pageId)).size,
    withImages: records.filter((record) => record.images.length).length,
    withTwoSideImages: records.filter((record) => record.images.length >= 2).length,
    withOfficialLegalReferences: records.filter((record) => record.legalReferences.length).length,
    byClass: Object.fromEntries(
      [...new Set(records.map((record) => record.coinClass))].sort().map((coinClassValue) => [coinClassValue, records.filter((record) => record.coinClass === coinClassValue).length]),
    ),
  };
  const output = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    title: "APOMONET — niezależny otwarty katalog monet PRL 1949–1989",
    policy: {
      scope: "Polskie monety obiegowe, okolicznościowe i kolekcjonerskie datowane 1949–1989",
      sourceMode: "CC BY-SA revision-pinned factual extraction with official ELI/ISAP references",
      imageMode: "Only item-level Commons files with explicit open licence metadata",
      exclusions: ["page prose", "Numista bulk data", "auction photographs", "unlicensed images"],
    },
    stats,
    records,
  };
  await writeFile(OUTPUT, gzipSync(`${JSON.stringify(output)}\n`, { level: 9 }));
  console.log(JSON.stringify(stats, null, 2));
  console.log(`[write] ${OUTPUT}`);
}

await main();
