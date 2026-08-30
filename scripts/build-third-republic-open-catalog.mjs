#!/usr/bin/env node

import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT = resolve(ROOT, "data/recognition/third-republic-open-catalog-v1.json.gz");
const RETRIEVED_AT = new Date().toISOString().slice(0, 10);
const args = new Set(process.argv.slice(2));

const TWO_ZLOTY_PAGE = "Monety okolicznościowe 2 złote (III RP)";
const DISCOVER_POLAND_PAGE = "Odkryj Polskę (seria monet)";
const BIELIK_PAGE = "Orzeł bielik (moneta)";
const COLLECTOR_YEARS = [
  1995, 1996, 1997, 1998, 1999, 2000, 2002,
  2005, 2006, 2007, 2008, 2009, 2010, 2011,
  2012, 2013, 2014, 2015, 2016, 2017, 2018,
  2019, 2020, 2021, 2022,
];
const COLLECTOR_PAGES = COLLECTOR_YEARS.map((year) => `Monety kolekcjonerskie III RP w ${year}`);
const SOURCE_TITLES = [TWO_ZLOTY_PAGE, DISCOVER_POLAND_PAGE, BIELIK_PAGE, ...COLLECTOR_PAGES];

const MONTHS = new Map([
  ["stycznia", 1], ["lutego", 2], ["marca", 3], ["kwietnia", 4],
  ["maja", 5], ["czerwca", 6], ["lipca", 7], ["sierpnia", 8],
  ["wrzesnia", 9], ["pazdziernika", 10], ["listopada", 11], ["grudnia", 12],
]);

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

function plainWikitext(value) {
  let text = String(value ?? "");
  text = text.replace(/<ref\b[^>]*>[\s\S]*?<\/ref>/gi, " ").replace(/<ref\b[^>]*\/>/gi, " ");
  text = text.replace(/<br\s*\/?>/gi, " / ");
  for (let iteration = 0; iteration < 6; iteration += 1) {
    text = text.replace(/{{(?:nowrap|formatnum|small|nobr)\|([^{}]*)}}/gi, "$1");
    text = text.replace(/{{[^{}]*}}/g, " ");
  }
  text = text.replace(/\[\[[^\]|]+\|([^\]]+)]]/g, "$1").replace(/\[\[([^\]]+)]]/g, "$1");
  text = text.replace(/\[[^\s\]]+\s+([^\]]+)]/g, "$1");
  text = text.replace(/'{2,}/g, "").replace(/<[^>]+>/g, " ").replace(/&nbsp;|&#160;/gi, " ");
  return clean(text);
}

function parseCell(line) {
  const raw = line.slice(1).trim();
  const match = raw.match(/^((?:(?:rowspan|colspan|style|class|scope|align|valign|width|bgcolor)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s|]+)\s*)+)\|\s*([\s\S]*)$/i);
  const attributes = match?.[1] || "";
  return {
    value: plainWikitext(match?.[2] ?? raw),
    rowspan: Number(attributes.match(/rowspan\s*=\s*"?(\d+)/i)?.[1] || 1),
    colspan: Number(attributes.match(/colspan\s*=\s*"?(\d+)/i)?.[1] || 1),
  };
}

function tableMatrix(table) {
  const pending = [];
  const rows = [];
  for (const chunk of table.split(/\n\|-/)) {
    const cells = [];
    let activeLine = "";
    for (const line of chunk.split(/\r?\n/)) {
      if (/^[|!](?![}|-])/.test(line)) {
        if (activeLine) cells.push(parseCell(activeLine));
        activeLine = line;
      } else if (activeLine && !/^\s*(?:\{|\|})/.test(line)) {
        activeLine += ` ${line}`;
      }
    }
    if (activeLine) cells.push(parseCell(activeLine));
    if (!cells.length) continue;

    const row = [];
    for (let column = 0; column < pending.length; column += 1) {
      if (!pending[column]?.remaining) continue;
      row[column] = pending[column].value;
      pending[column].remaining -= 1;
      if (!pending[column].remaining) pending[column] = null;
    }

    let column = 0;
    for (const cell of cells) {
      while (row[column] !== undefined) column += 1;
      for (let span = 0; span < cell.colspan; span += 1) {
        row[column + span] = cell.value;
        if (cell.rowspan > 1) pending[column + span] = { value: cell.value, remaining: cell.rowspan - 1 };
      }
      column += cell.colspan;
    }
    rows.push(row.map(clean));
  }
  return rows;
}

function matrices(wikitext) {
  return [...wikitext.matchAll(/\{\|[\s\S]*?\n\|\}/g)].map((match) => tableMatrix(match[0]));
}

function headerMap(row) {
  return new Map(row.map((cell, index) => [normalized(cell), index]));
}

function column(headers, ...patterns) {
  for (const [name, index] of headers) {
    if (patterns.some((pattern) => pattern.test(name))) return index;
  }
  return -1;
}

function numberValue(value) {
  const match = clean(value).replace(/\s/g, "").match(/\d+(?:[.,]\d+)?/);
  return match ? Number(match[0].replace(",", ".")) : null;
}

function dimensions(value) {
  const values = [...clean(value).matchAll(/\d+(?:[.,]\d+)?/g)].map((match) => Number(match[0].replace(",", ".")));
  return values.slice(0, 3);
}

function normalizeNominal(value) {
  const amount = numberValue(value);
  return amount ? `${amount} zł` : clean(value);
}

function polishDate(value, year) {
  const text = normalized(value);
  const match = text.match(/(\d{1,2})\s+([a-z]+)(?:\s+(\d{4}))?/);
  if (!match) return "";
  const month = MONTHS.get(match[2]);
  if (!month) return "";
  const resolvedYear = Number(match[3] || year);
  return `${resolvedYear}-${String(month).padStart(2, "0")}-${String(Number(match[1])).padStart(2, "0")}`;
}

function pageUrl(page) {
  return `https://pl.wikipedia.org/w/index.php?title=${encodeURIComponent(page.title.replace(/ /g, "_"))}&oldid=${page.revisionId}`;
}

function sourceFor(page, family, rowKey) {
  return {
    type: "open-reference",
    name: "Wikipedia (PL) — wersjonowane zestawienie emisji NBP",
    recordId: `pageid:${page.pageid}; revid:${page.revisionId}; family:${family}; row:${rowKey}`,
    pageId: `pageid:${page.pageid}; revid:${page.revisionId}`,
    url: pageUrl(page),
    retrievedAt: RETRIEVED_AT,
    rights: "CC BY-SA 4.0; znormalizowane fakty tabelaryczne z atrybucją i identyfikatorem wersji; bez opisów, ilustracji i numerów katalogowych",
    rightsCode: "explicit-open-license",
    restricted: false,
    accessMode: "revision-pinned-structured-facts",
    revisionTimestamp: page.revisionTimestamp,
  };
}

function commonRecord({ page, family, rowKey, topic, year, nominal, metal, weightGrams, diameterMm, dimensionsMm, mintage, issueDate, designer, series, coinClass = "collector" }) {
  const source = sourceFor(page, family, rowKey);
  const shape = dimensionsMm?.length >= 2 ? "rectangular" : "round";
  return {
    id: `third-republic-open:${stableId(`${page.pageid}|${page.revisionId}|${family}|${rowKey}`)}`,
    title: `${topic}, ${nominal}, ${metal}, ${year}`,
    objectKind: "coin",
    coinClass,
    country: "Polska",
    ruler: "Narodowy Bank Polski",
    year: String(year),
    yearRange: [Number(year), Number(year)],
    period: "third-republic",
    nominal,
    metal,
    mint: "Warszawa",
    shape,
    weightGrams: weightGrams || null,
    diameterMm: diameterMm || null,
    ...(dimensionsMm?.length >= 2 ? { dimensionsMm } : {}),
    mintage: mintage || null,
    issueDate: issueDate || "",
    designer: clean(designer),
    portrait: topic,
    variant: clean(series),
    obverseLegend: `RZECZPOSPOLITA POLSKA ${year}`,
    reverseLegend: topic,
    diagnosticMarkers: [topic, nominal, metal, series ? `seria: ${clean(series)}` : ""].filter(Boolean),
    images: [],
    imageRights: [],
    source,
  };
}

function recordsFromTwoZloty(page) {
  const records = [];
  const sections = page.wikitext.split(/(?====\s*Rok\s+\d{4}\s*===)/i);
  for (const section of sections) {
    const year = Number(section.match(/^===\s*Rok\s+(\d{4})\s*===/i)?.[1]);
    if (!year) continue;
    for (const matrix of matrices(section)) {
      const headerIndex = matrix.findIndex((row) => row.some((cell) => normalized(cell) === "moneta") && row.some((cell) => /data emisji/.test(normalized(cell))));
      if (headerIndex < 0) continue;
      const headers = headerMap(matrix[headerIndex]);
      const topicIndex = column(headers, /^moneta$/);
      const seriesIndex = column(headers, /^seria$/);
      const dateIndex = column(headers, /data emisji/);
      const mintageIndex = column(headers, /naklad/);
      const designerIndex = column(headers, /projektant/);
      matrix.slice(headerIndex + 1).forEach((row, index) => {
        const topic = clean(row[topicIndex]);
        if (!topic || /^(moneta|razem)$/i.test(topic)) return;
        records.push(commonRecord({
          page,
          family: "commemorative-2-zl",
          rowKey: `${year}-${index + 1}`,
          topic,
          year,
          nominal: "2 zł",
          metal: year === 1995 ? "Miedzionikiel CuNi" : "Nordic Gold CuAl5Zn5Sn1",
          weightGrams: year === 1995 ? 10.8 : 8.15,
          diameterMm: year === 1995 ? 29.5 : 27,
          mintage: numberValue(row[mintageIndex]),
          issueDate: polishDate(row[dateIndex], year),
          designer: row[designerIndex],
          series: row[seriesIndex],
          coinClass: "circulating-commemorative",
        }));
      });
    }
  }
  return records;
}

function recordsFromDiscoverPoland(page) {
  const matrix = matrices(page.wikitext).find((rows) => rows.some((row) => row.some((cell) => normalized(cell) === "temat") && row.some((cell) => /wprowadzona do obiegu/.test(normalized(cell))))) || [];
  const headerIndex = matrix.findIndex((row) => row.some((cell) => normalized(cell) === "temat"));
  if (headerIndex < 0) return [];
  const headers = headerMap(matrix[headerIndex]);
  const ordinalIndex = column(headers, /^lp$/);
  const yearIndex = column(headers, /rok emisji/);
  const topicIndex = column(headers, /^temat$/);
  const dateIndex = column(headers, /wprowadzona do obiegu/);
  const mintageIndex = column(headers, /naklad/);
  const designerIndex = column(headers, /projekt/);
  return matrix.slice(headerIndex + 1).flatMap((row) => {
    const ordinal = numberValue(row[ordinalIndex]);
    const year = numberValue(row[yearIndex]);
    const topic = clean(row[topicIndex]);
    if (!ordinal || !year || year > 2022 || !topic) return [];
    return [commonRecord({
      page,
      family: "discover-poland-5-zl",
      rowKey: ordinal,
      topic: `Odkryj Polskę – ${topic}`,
      year,
      nominal: "5 zł",
      metal: "Pierścień MN25, rdzeń CuAl6Ni2",
      weightGrams: 6.54,
      diameterMm: 24,
      mintage: numberValue(row[mintageIndex]),
      issueDate: polishDate(row[dateIndex], year),
      designer: row[designerIndex],
      series: "Odkryj Polskę",
      coinClass: "circulating-commemorative",
    })];
  });
}

function recordsFromBielik(page) {
  const matrix = matrices(page.wikitext).find((rows) => rows.some((row) => row.some((cell) => normalized(cell) === "rok") && row.filter((cell) => /zlotych/.test(normalized(cell))).length >= 3)) || [];
  const headerIndex = matrix.findIndex((row) => normalized(row[0]) === "rok");
  if (headerIndex < 0) return [];
  const nominals = [50, 100, 200, 500];
  const measurements = new Map([
    [50, { weightGrams: 3.1, diameterMm: 18 }],
    [100, { weightGrams: 7.78, diameterMm: 22 }],
    [200, { weightGrams: 15.55, diameterMm: 27 }],
    [500, { weightGrams: 31.1, diameterMm: 32 }],
  ]);
  return matrix.slice(headerIndex + 1).flatMap((row) => {
    const year = numberValue(row[0]);
    if (!year || year < 1995 || year > 2024) return [];
    const series = year >= 2018 ? "Bielik" : "Orzeł Bielik";
    return nominals.flatMap((nominal, index) => {
      const mintage = numberValue(row[index + 1]);
      if (!mintage) return [];
      return [commonRecord({
        page,
        family: "bullion-bielik",
        rowKey: `${year}-${nominal}`,
        topic: series,
        year,
        nominal: `${nominal} zł`,
        metal: "Złoto Au 999,9",
        ...measurements.get(nominal),
        mintage,
        series,
        coinClass: "bullion",
      })];
    });
  });
}

function recordsFromCollectorYear(page, year) {
  const records = [];
  for (const matrix of matrices(page.wikitext)) {
    const headerIndex = matrix.findIndex((row) => row.some((cell) => normalized(cell) === "moneta") && row.some((cell) => normalized(cell) === "nominal") && row.some((cell) => /naklad/.test(normalized(cell))));
    if (headerIndex < 0) continue;
    const headers = headerMap(matrix[headerIndex]);
    const topicIndex = column(headers, /^moneta$/);
    const nominalIndex = column(headers, /^nominal$/);
    const metalIndex = column(headers, /^(stop|metal)$/);
    const diameterIndex = column(headers, /srednica/, /wymiary/);
    const weightIndex = column(headers, /^masa/);
    const mintageIndex = column(headers, /naklad/);
    const dateIndex = column(headers, /data emisji/);
    const designerIndex = column(headers, /projektant/);
    let lastRecord = null;
    matrix.slice(headerIndex + 1).forEach((row, index) => {
      const topic = clean(row[topicIndex]).replace(/^\|\s*/, "").replace(/\s*\/\s*$/, "");
      const nominal = normalizeNominal(row[nominalIndex]);
      const nominalAmount = numberValue(nominal);
      if (!topic || !nominalAmount || nominalAmount === 2 || nominalAmount === 5) return;
      const metal = clean(row[metalIndex]);
      const weightGrams = numberValue(row[weightIndex]);
      const mintage = numberValue(row[mintageIndex]);
      if (!weightGrams || !mintage) {
        // Several annual tables place a visual-technology note in a separate
        // colspan row below the coin (for example tampodruk, hologram or
        // selective gilding). It describes the preceding record and is not a
        // second coin.
        if (lastRecord && metal && row.slice(metalIndex + 1).every((cell) => !cell || cell === metal)) {
          lastRecord.variant = [lastRecord.variant, metal].filter(Boolean).join("; ");
          lastRecord.diagnosticMarkers.push(metal);
        }
        return;
      }
      const measure = dimensions(row[diameterIndex]);
      const multiDimension = /[x×]/i.test(clean(row[diameterIndex])) && measure.length >= 2;
      const series = clean(topic.match(/(?:^|\s)Seria:\s*([^/]+)$/i)?.[1] || "");
      const cleanTopic = clean(topic.replace(/(?:^|\s)Seria:\s*[\s\S]*$/i, "")).replace(/\s*\/\s*$/, "");
      lastRecord = commonRecord({
        page,
        family: "collector-annual",
        rowKey: `${year}-${index + 1}`,
        topic: cleanTopic,
        year,
        nominal,
        metal,
        weightGrams,
        diameterMm: multiDimension ? null : measure[0] || null,
        dimensionsMm: multiDimension ? measure : undefined,
        mintage,
        issueDate: polishDate(row[dateIndex], year),
        designer: row[designerIndex],
        series,
        coinClass: "collector",
      });
      records.push(lastRecord);
    });
  }
  return records;
}

async function fetchPages() {
  const url = new URL("https://pl.wikipedia.org/w/api.php");
  url.search = new URLSearchParams({
    action: "query",
    format: "json",
    formatversion: "2",
    prop: "revisions",
    rvprop: "ids|timestamp|content",
    rvslots: "main",
    titles: SOURCE_TITLES.join("|"),
  });
  const response = await fetch(url, { headers: { "User-Agent": "APOMONET-source-builder/1.0" } });
  if (!response.ok) throw new Error(`Wikipedia API: HTTP ${response.status}`);
  const body = await response.json();
  const pages = (body.query?.pages || []).filter((page) => !page.missing).map((page) => ({
    title: page.title,
    pageid: page.pageid,
    revisionId: page.revisions?.[0]?.revid,
    revisionTimestamp: page.revisions?.[0]?.timestamp,
    wikitext: page.revisions?.[0]?.slots?.main?.content || "",
  }));
  const byTitle = new Map(pages.map((page) => [page.title, page]));
  const missing = SOURCE_TITLES.filter((title) => !byTitle.has(title));
  if (missing.length) throw new Error(`Brak stron źródłowych: ${missing.join(", ")}`);
  return byTitle;
}

const pages = await fetchPages();
const records = [
  ...recordsFromTwoZloty(pages.get(TWO_ZLOTY_PAGE)),
  ...recordsFromDiscoverPoland(pages.get(DISCOVER_POLAND_PAGE)),
  ...recordsFromBielik(pages.get(BIELIK_PAGE)),
  ...COLLECTOR_YEARS.flatMap((year) => recordsFromCollectorYear(pages.get(`Monety kolekcjonerskie III RP w ${year}`), year)),
];

const ids = new Set(records.map((record) => record.id));
if (ids.size !== records.length) throw new Error("Wygenerowano zduplikowane identyfikatory rekordów");

const byFamily = records.reduce((stats, record) => {
  const family = record.source.recordId.match(/family:([^;]+)/)?.[1] || "unknown";
  stats[family] = (stats[family] || 0) + 1;
  return stats;
}, {});

const catalog = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  policy: {
    purpose: "Otwarte, wersjonowane fakty o polskich monetach okolicznościowych, kolekcjonerskich i bulionowych III RP",
    sourceMode: "CC BY-SA revision-pinned structured facts; official NBP and ELI links retained by source pages",
    rightsGate: "Bez kopiowania opisów, zdjęć, układu stron i numerów z chronionych katalogów",
    coverageGaps: "Brakujące roczniki kolekcjonerskie 2001, 2003 i 2004 wymagają osobnego importu z ELI; monety próbne po 1994 roku są osobnym zbiorem",
    provenanceRequired: true,
  },
  stats: {
    records: records.length,
    sourcePages: pages.size,
    byFamily,
    byNominal: records.reduce((stats, record) => {
      stats[record.nominal] = (stats[record.nominal] || 0) + 1;
      return stats;
    }, {}),
    withMeasurements: records.filter((record) => record.weightGrams && (record.diameterMm || record.dimensionsMm)).length,
    withMintage: records.filter((record) => record.mintage).length,
    withImages: records.filter((record) => record.images.length).length,
  },
  records,
};

if (!args.has("--dry-run")) {
  await writeFile(OUTPUT, gzipSync(`${JSON.stringify(catalog)}\n`, { level: 9 }));
  console.log(`[write] ${OUTPUT}`);
}
console.log(JSON.stringify(catalog.stats, null, 2));
