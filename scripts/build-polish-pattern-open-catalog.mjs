#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CACHE = resolve(ROOT, "data/recognition/build/prl-open-pages-v1.json");
const OUTPUT = resolve(ROOT, "data/recognition/polish-pattern-open-catalog-v1.json.gz");
const RETRIEVED_AT = new Date().toISOString().slice(0, 10);

const SOURCE_PAGES = [
  {
    title: "Monety próbne kolekcjonerskie (1964–1991)",
    series: "collector-pattern",
  },
  {
    title: "Monety próbne mosiężne (seria monet)",
    series: "brass-pattern",
  },
  {
    title: "Monety próbne niklowe (seria monet)",
    series: "nickel-pattern",
  },
];

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
  for (let iteration = 0; iteration < 5; iteration += 1) {
    text = text.replace(/{{(?:nowrap|formatnum|small|nobr)\|([^{}]*)}}/gi, "$1");
    text = text.replace(/{{[^{}]*}}/g, " ");
  }
  text = text.replace(/\[\[[^\]|]+\|([^\]]+)]]/g, "$1").replace(/\[\[([^\]]+)]]/g, "$1");
  text = text.replace(/\[[^\s\]]+\s+([^\]]+)]/g, "$1");
  text = text.replace(/'{2,}/g, "").replace(/<[^>]+>/g, " ").replace(/&nbsp;|&#160;/gi, " ");
  return clean(text);
}

function numberRange(value) {
  const values = [...plainWikitext(value).matchAll(/\d+(?:[.,]\d+)?/g)].map((match) => Number(match[0].replace(",", ".")));
  if (!values.length) return [];
  return values.slice(0, 2).sort((a, b) => a - b);
}

function representativeNumber(value) {
  const values = numberRange(value);
  if (!values.length) return null;
  if (values.length === 1) return values[0];
  return Number(((values[0] + values[1]) / 2).toFixed(3));
}

function normalizeNominal(value) {
  return clean(plainWikitext(value)
    .replace(/złot(?:ych|e|y)/gi, "zł")
    .replace(/grosz(?:y|e)?/gi, "gr"));
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
        if (cell.rowspan > 1) {
          pending[column + span] = { value: cell.value, remaining: cell.rowspan - 1 };
        }
      }
      column += cell.colspan;
    }
    rows.push(row);
  }
  return rows;
}

function dataRows(wikitext) {
  return [...wikitext.matchAll(/\{\|[\s\S]*?\n\|\}/g)]
    .flatMap((match) => tableMatrix(match[0]))
    .filter((row) => /^\d+$/.test(row[0]));
}

function periodFrom(year) {
  return year <= 1989 ? "people-republic" : "third-republic";
}

function markDescription(value, fallback = "wypukły napis PRÓBA") {
  const text = normalized(value);
  if (text.includes("bez napisu proba")) return "bez napisu PRÓBA";
  if (text.includes("wklesly")) return "wklęsły napis PRÓBA";
  if (text.includes("wypukly")) return "wypukły napis PRÓBA";
  return fallback;
}

function sourceFor(page, rowNumber) {
  return {
    type: "open-reference",
    name: "Wikipedia (PL) — wersjonowane otwarte zestawienie polskich monet próbnych",
    recordId: `pageid:${page.pageid}; revid:${page.revisionId}; row:${rowNumber}`,
    pageId: `pageid:${page.pageid}; revid:${page.revisionId}`,
    url: `https://pl.wikipedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, "_"))}`,
    retrievedAt: RETRIEVED_AT,
    rights: "CC BY-SA 4.0; znormalizowane fakty tabelaryczne z atrybucją i identyfikatorem wersji; bez numerów współczesnych katalogów, opisów i zdjęć aukcyjnych",
    rightsCode: "explicit-open-license",
    restricted: false,
    accessMode: "revision-pinned-structured-facts",
    revisionTimestamp: page.revisionTimestamp,
  };
}

function commonRecord(page, series, rowNumber, fields) {
  const year = Number(fields.year);
  const nominal = normalizeNominal(fields.nominal);
  const subject = clean(fields.subject);
  const material = clean(fields.material);
  const weightRange = numberRange(fields.weight);
  const mark = markDescription(`${subject} ${fields.mark || ""} ${fields.notes || ""}`);
  const source = sourceFor(page, rowNumber);
  return {
    id: `pattern-open:${stableId(`${page.pageid}|${page.revisionId}|${rowNumber}`)}`,
    title: [nominal, year, "próba", material, subject].filter(Boolean).join(" — "),
    objectKind: "pattern",
    coinClass: "pattern",
    patternSeries: series,
    country: "Polska",
    ruler: "Narodowy Bank Polski",
    year: String(year),
    yearRange: [year, year],
    period: periodFrom(year),
    nominal,
    metal: material,
    mint: "Mennica Państwowa, Warszawa",
    shape: "round",
    weightGrams: representativeNumber(fields.weight),
    weightRangeGrams: weightRange.length > 1 ? weightRange : [],
    diameterMm: representativeNumber(fields.diameter),
    edge: clean(fields.edge),
    strike: clean(fields.strike),
    designer: clean(fields.designer),
    portrait: subject,
    variant: [mark, material, fields.strike].filter(Boolean).join("; "),
    diagnosticMarkers: [
      mark,
      subject,
      material,
      fields.edge ? `rant: ${clean(fields.edge)}` : "",
      fields.strike ? `stempel: ${clean(fields.strike)}` : "",
      fields.designer ? `projekt: ${clean(fields.designer)}` : "",
    ].filter(Boolean),
    images: [],
    imageRights: [],
    source,
  };
}

function rowsWithUniqueKeys(wikitext) {
  const occurrences = new Map();
  return dataRows(wikitext).map((row) => {
    const occurrence = (occurrences.get(row[0]) || 0) + 1;
    occurrences.set(row[0], occurrence);
    return {
      row,
      rowKey: occurrence === 1 ? row[0] : `${row[0]}-${occurrence}`,
    };
  });
}

function collectorRecords(page) {
  return rowsWithUniqueKeys(page.wikitext).map(({ row, rowKey }) => {
    const catalogueIndex = row.findIndex((value, index) => index > 8 && /^P\s*\d+/i.test(clean(value)));
    const designer = catalogueIndex > 0 ? row[catalogueIndex - 1] : "";
    const notes = catalogueIndex >= 0 && catalogueIndex + 1 < row.length - 1 ? row[catalogueIndex + 1] : "";
    return commonRecord(page, "collector-pattern", rowKey, {
      nominal: row[1],
      year: row[2],
      subject: row[3],
      material: row[4],
      diameter: row[5],
      weight: row[6],
      edge: row[7],
      strike: row[8],
      designer,
      notes,
    });
  });
}

function brassRecords(page) {
  return rowsWithUniqueKeys(page.wikitext).map(({ row, rowKey }) => commonRecord(page, "brass-pattern", rowKey, {
    nominal: row[1],
    year: row[2],
    subject: "mosiężna próba obiegowego wzoru",
    material: "mosiądz",
    diameter: row[3],
    weight: row[4],
    mark: row[5],
    designer: row[6],
    notes: row[7],
  }));
}

function nickelRecords(page) {
  return rowsWithUniqueKeys(page.wikitext).map(({ row, rowKey }) => commonRecord(page, "nickel-pattern", rowKey, {
    nominal: row[1],
    year: row[2],
    subject: row[3],
    material: "nikiel",
    diameter: row[4],
    weight: row[5],
    designer: row[6],
    notes: row.length >= 13 ? row[11] : row[8],
  }));
}

function nominalKey(value) {
  const match = normalized(value).match(/\b(\d+)\s*(zl|gr)/);
  return match ? `${match[1]}-${match[2]}` : "";
}

function imageMatchScore(image, record) {
  const imageText = normalized(image.title);
  if (!imageText.includes("proba") || !imageText.includes(record.year)) return -1;
  const key = nominalKey(record.nominal);
  if (key) {
    const [amount, unit] = key.split("-");
    const unitPattern = unit === "zl" ? "(?:zl|zlot)" : "(?:gr|grosz)";
    if (!new RegExp(`\\b${amount}\\s*${unitPattern}`).test(imageText)) return -1;
  }
  const material = normalized(record.metal);
  const materialHints = [
    [/\bmosiadz\b/, "mosiadz"],
    [/\bnikiel\b|\bni\b/, "nikiel"],
    [/\bmiedzionikiel\b|\bcuni\b/, "miedzionikiel"],
    [/\bsrebro\b|\bag\b/, "srebro"],
    [/\bzlot[oaey]\b|\bau\b/, "zloto"],
  ];
  const hint = materialHints.find(([pattern]) => pattern.test(imageText))?.[1] || "";
  if (hint && !material.includes(hint)) return -1;
  const ignored = new Set(["proba", "awers", "rewers", "jpg", "jpeg", "png", "moneta", "polska", "zlotych", "groszy"]);
  const subjectTokens = normalized(record.portrait).split(" ").filter((token) => token.length >= 5 && !ignored.has(token));
  const matches = subjectTokens.filter((token) => imageText.includes(token)).length;
  return 10 + matches * 4;
}

function attachImages(records, images) {
  for (const image of images || []) {
    const ranked = records
      .map((record) => ({ record, score: imageMatchScore(image, record) }))
      .filter((item) => item.score >= 10)
      .sort((a, b) => b.score - a.score);
    if (!ranked.length || (ranked[1] && ranked[0].score === ranked[1].score)) continue;
    const record = ranked[0].record;
    if (record.images.includes(image.url)) continue;
    record.images.push(image.url);
    record.imageRights.push({
      url: image.url,
      sourceUrl: image.descriptionUrl,
      license: image.license,
      licenseUrl: image.licenseUrl,
      attribution: image.artist || image.credit,
    });
  }
}

async function main() {
  const raw = JSON.parse(await readFile(CACHE, "utf8"));
  const pages = new Map(raw.pages.map((page) => [page.title, page]));
  for (const source of SOURCE_PAGES) {
    if (!pages.has(source.title)) {
      throw new Error(`Brak strony ${source.title} w ${CACHE}; uruchom najpierw build-prl-open-catalog.mjs --refresh`);
    }
  }

  const collectorPage = pages.get(SOURCE_PAGES[0].title);
  const brassPage = pages.get(SOURCE_PAGES[1].title);
  const nickelPage = pages.get(SOURCE_PAGES[2].title);
  const records = [
    ...collectorRecords(collectorPage),
    ...brassRecords(brassPage),
    ...nickelRecords(nickelPage),
  ].sort((a, b) => Number(a.year) - Number(b.year) || a.nominal.localeCompare(b.nominal, "pl") || a.title.localeCompare(b.title, "pl"));
  attachImages(records, raw.images);

  const stats = {
    sourcePages: SOURCE_PAGES.length,
    records: records.length,
    withImages: records.filter((record) => record.images.length).length,
    withTwoSideImages: records.filter((record) => record.images.length >= 2).length,
    withWeight: records.filter((record) => record.weightGrams > 0).length,
    withDiameter: records.filter((record) => record.diameterMm > 0).length,
    bySeries: Object.fromEntries(SOURCE_PAGES.map((source) => [source.series, records.filter((record) => record.patternSeries === source.series).length])),
    byPeriod: Object.fromEntries(["people-republic", "third-republic"].map((period) => [period, records.filter((record) => record.period === period).length])),
  };
  const output = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    title: "APOMONET — otwarty katalog polskich monet próbnych 1949–1994",
    policy: {
      scope: "Polskie próby niklowe, mosiężne i kolekcjonerskie datowane 1949–1994",
      sourceMode: "CC BY-SA 4.0 revision-pinned structured table facts",
      imageMode: "Only item-level Commons files with explicit open licence metadata",
      exclusions: [
        "contemporary catalogue numbering",
        "page prose",
        "auction photographs",
        "unlicensed images",
        "market valuations",
      ],
      attribution: SOURCE_PAGES.map((source) => `https://pl.wikipedia.org/wiki/${encodeURIComponent(source.title.replace(/ /g, "_"))}`),
    },
    stats,
    records,
  };
  await writeFile(OUTPUT, gzipSync(`${JSON.stringify(output)}\n`, { level: 9 }));
  console.log(JSON.stringify(stats, null, 2));
  console.log(`[write] ${OUTPUT}`);
}

await main();
