#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT = resolve(ROOT, "data/recognition/ans-polish-catalog-v1.json.gz");
const API = "https://numismatics.org/search/apis/search";
const RETRIEVED_AT = new Date().toISOString().slice(0, 10);
const SEARCH_QUERIES = [
  "Poland", "Polish", "Polonia", "Danzig", "Gdansk", "Thorn", "Torun", "Elbing", "Bromberg",
  "Sigismund III Vasa", "Sigismund II Augustus", "Sigismund I the Old", "Stephen Bathory",
  "John II Casimir Vasa", "John III Sobieski", "Wladislaus IV Vasa", "Stanislaus Augustus",
  "Boleslaus Poland", "Mieszko", "Kingdom of Poland", "Prussia protectorate", "Duchy of Warsaw",
];

function clean(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function decodeXml(value) {
  return clean(value)
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function tag(xml, name) {
  return decodeXml(xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, "i"))?.[1]);
}

function mapMetal(value) {
  const metal = clean(value).toLowerCase();
  if (metal.includes("gold")) return "złoto";
  if (metal.includes("silver")) return "srebro";
  if (metal.includes("copper alloy")) return "stop miedzi";
  if (metal.includes("copper")) return "miedź";
  if (metal.includes("bronze")) return "brąz";
  if (metal.includes("nickel")) return "nikiel";
  return "";
}

function mapNominal(value) {
  const n = clean(value).toLowerCase();
  const count = clean(n.match(/^(\d+(?:\/\d+)?)\s+/)?.[1]);
  const named = n.replace(/^\d+(?:\/\d+)?\s+/, "");
  const names = [
    ["groschen", "grosz"], ["grosz", "grosz"], ["schilling", "szeląg"],
    ["solidus", "szeląg"], ["denarius", "denar"], ["denar", "denar"],
    ["ort", "ort"], ["thaler", "talar"], ["taler", "talar"],
    ["ducat", "dukat"], ["florin", "floren"], ["kopeck", "kopiejka"],
    ["ruble", "rubel"], ["mark", "marka"], ["pfennig", "fenig"],
    ["zloty", "złoty"], ["złoty", "złoty"], ["bracteate", "brakteat"],
  ];
  const base = names.find(([token]) => named.includes(token))?.[1] || "";
  if (!base) return "";
  if (count === "1/2" && base === "grosz") return "Półgrosz";
  if (count === "3" && base === "grosz") return "Trojak";
  if (count === "4" && base === "grosz") return "Czworak";
  if (count === "6" && base === "grosz") return "Szóstak";
  if (count === "18" && base === "grosz") return "Ort";
  if (count === "2" && base === "talar") return "Dwutalar";
  return `${count && count !== "1" ? `${count} ` : ""}${base[0].toUpperCase()}${base.slice(1)}`;
}

function mapRuler(value) {
  const ruler = clean(value)
    .replace(/Sigismund III Vasa/i, "Zygmunt III Waza")
    .replace(/Sigismund II Augustus/i, "Zygmunt II August")
    .replace(/Sigismund I the Old/i, "Zygmunt I Stary")
    .replace(/Stephen B[aá]thory/i, "Stefan Batory")
    .replace(/John II Casimir Vasa/i, "Jan II Kazimierz")
    .replace(/John III Sobieski/i, "Jan III Sobieski")
    .replace(/Wladislaus IV Vasa/i, "Władysław IV Waza")
    .replace(/Stanislaus Augustus/i, "Stanisław August Poniatowski")
    .replace(/Alexander Jagiellon/i, "Aleksander Jagiellończyk");
  return ruler.slice(0, 180);
}

function polishRelated(value) {
  return /\b(pol(?:and|ish|onia)|danzig|gdansk|thorn|torun|elbing|bromberg|bydgoszcz|marienburg|malbork|krakau|krakow|warsaw|warszawa|vilnius|wilno|riga|ryga|sigismund|zygmunt|casimir|kazimierz|bathory|batory|sobieski|wladislaus|władysław|stanislaus augustus|boleslaus|bolesław|mieszko|jagiellon|vasa|waza|prussia protectorate|duchy of warsaw)\b/i.test(value);
}

function mapMint(value) {
  const n = clean(value).toLowerCase();
  const aliases = [
    [["gdansk", "danzig"], "Gdańsk"], [["bromberg", "bydgoszcz"], "Bydgoszcz"],
    [["krakau", "krakow"], "Kraków"], [["marienburg", "malbork"], "Malbork"],
    [["thorn", "torun"], "Toruń"], [["elbing", "elblag"], "Elbląg"],
    [["vilnius", "vilna", "wilno"], "Wilno"], [["warsaw", "warszawa"], "Warszawa"],
    [["riga", "ryga"], "Ryga"], [["posen", "poznan"], "Poznań"],
    [["fraustadt", "wschowa"], "Wschowa"], [["olkusz"], "Olkusz"],
    [["tykocin"], "Tykocin"], [["leipzig"], "Lipsk"], [["berlin"], "Berlin"],
  ];
  return aliases.find(([tokens]) => tokens.some((token) => n.includes(token)))?.[1] || "";
}

function parseTitle(sourceTitle, link) {
  const title = clean(sourceTitle);
  if (!polishRelated(title)) return null;
  const match = title.match(/^(.+?)\s+(.+?)\s+of\s+(.+?),\s*(.+?)\.\s*([^.]+(?:\.[^.]+)*)$/i);
  if (!match) return null;
  const [, metalText, nominalText, authorityAndPlace, dateText] = match;
  const year = clean(dateText.match(/\b(9\d{2}|1\d{3}|20\d{2})\b/)?.[1]);
  const nominal = mapNominal(nominalText);
  const authorityParts = authorityAndPlace.split("|").map(clean).filter(Boolean);
  const ruler = mapRuler(authorityParts[0]?.split(",")[0]);
  const mint = mapMint(`${authorityAndPlace}, ${dateText}`);
  if (!year || !nominal || !ruler) return null;
  const recordId = clean(link.split("/").pop());
  const id = createHash("sha1").update(link).digest("hex").slice(0, 20);
  return {
    id: `ans-meta:${id}`,
    title: [nominal, ruler, year, mint].filter(Boolean).join(", "),
    objectKind: /\b(pattern|trial|essai|proba|próba)\b/i.test(title) ? "pattern-coin" : "coin",
    country: "Polska / ziemie historycznie polskie",
    ruler,
    year,
    nominal,
    metal: mapMetal(metalText),
    mint,
    shape: "round",
    weightGrams: null,
    diameterMm: null,
    portrait: "",
    obverseLegend: "",
    reverseLegend: "",
    diagnosticMarkers: [],
    images: [],
    source: {
      type: "museum-catalog-metadata",
      name: "American Numismatic Society — MANTIS",
      recordId,
      url: link.replace(/^http:/, "https:"),
      rights: "ANS collections metadata under ODbL 1.0; media intentionally not imported",
      rightsCode: "explicit-open-license",
      restricted: false,
      retrievedAt: RETRIEVED_AT,
    },
  };
}

async function fetchXml(query, start, attempt = 1) {
  const url = new URL(API);
  url.searchParams.set("q", query);
  url.searchParams.set("format", "rss");
  url.searchParams.set("start", String(start));
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { "User-Agent": "APOMONET-metadata-builder/1.0" } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.text();
  } catch (error) {
    if (attempt >= 4) throw error;
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 500 * 2 ** attempt));
    return fetchXml(query, start, attempt + 1);
  } finally {
    clearTimeout(timeout);
  }
}

const records = [];
let rejected = 0;
let reportedResults = 0;
const queryStats = [];
for (const query of SEARCH_QUERIES) {
  const first = await fetchXml(query, 0);
  const total = Number(tag(first, "opensearch:totalResults")) || 0;
  const pages = Math.min(40, Math.ceil(total / 100));
  let acceptedForQuery = 0;
  reportedResults += total;
  for (let page = 0; page < pages; page += 1) {
    const xml = page === 0 ? first : await fetchXml(query, page * 100);
    for (const itemXml of xml.match(/<item>[\s\S]*?<\/item>/gi) || []) {
      const record = parseTitle(tag(itemXml, "title"), tag(itemXml, "link"));
      if (record) {
        records.push(record);
        acceptedForQuery += 1;
      } else rejected += 1;
    }
    console.log(`[ANS] ${query}: ${page + 1}/${pages}; accepted=${records.length}`);
  }
  queryStats.push({ query, reported: total, accepted: acceptedForQuery });
}
const bySource = new Map(records.map((record) => [record.source.recordId, record]));
const uniqueRecords = [...bySource.values()].sort((a, b) => Number(a.year) - Number(b.year) || a.title.localeCompare(b.title, "pl"));
const catalog = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  sourcePolicy: {
    metadataLicense: "ODbL 1.0",
    mediaImported: false,
    descriptionPolicy: "ApoMonet-generated normalized identity fields from factual catalog metadata",
    source: "https://numismatics.org/search/",
  },
  stats: {
    reportedResults,
    acceptedRecords: uniqueRecords.length,
    rejectedRecords: rejected,
    patternRecords: uniqueRecords.filter((record) => record.objectKind === "pattern-coin").length,
    withMint: uniqueRecords.filter((record) => record.mint).length,
  },
  queries: queryStats,
  records: uniqueRecords,
};
await mkdir(dirname(OUTPUT), { recursive: true });
await writeFile(OUTPUT, gzipSync(`${JSON.stringify(catalog)}\n`, { level: 9 }));
console.log(JSON.stringify(catalog.stats, null, 2));
console.log(`[ANS] zapisano ${OUTPUT}`);
