#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BUILD_DIR = resolve(ROOT, "data/recognition/build");
const CACHE = resolve(BUILD_DIR, "europeana-polish-metadata-v1.json");
const OUTPUT = resolve(ROOT, "data/recognition/europeana-polish-catalog-v1.json.gz");
const API = "https://api.europeana.eu/record/v2/search.json";
const ROWS = 100;
const RETRIEVED_AT = new Date().toISOString().slice(0, 10);
const args = new Set(process.argv.slice(2));
const refresh = args.has("--refresh");
const maxPagesArg = process.argv.find((value) => value.startsWith("--max-pages="));
const maxPages = maxPagesArg ? Math.max(1, Number(maxPagesArg.split("=")[1]) || 1) : 20;
const apiKey = process.env.EUROPEANA_API_KEY || "api2demo";

// Overlapping queries are deliberate. Europeana providers describe the same
// historical states, rulers, mints and denominations in several languages.
// Exact Europeana item IDs are de-duplicated before normalization.
const SEARCH_QUERIES = [
  "what:coin AND (Poland OR Polska OR Polonia OR Polen)",
  "what:moneta AND (Poland OR Polska OR Polonia OR Polen)",
  "what:Münze AND (Poland OR Polska OR Polonia OR Polen)",
  "(coin OR moneta OR Münze) AND (Polish OR polska OR polonais OR polnisch)",
  "(coin OR moneta OR Münze) AND (Danzig OR Gdańsk OR Gdansk)",
  "(coin OR moneta OR Münze) AND (Thorn OR Toruń OR Torun)",
  "(coin OR moneta OR Münze) AND (Elbing OR Elbląg OR Elblag)",
  "(coin OR moneta OR Münze) AND (Vilnius OR Wilno OR Vilna)",
  "(coin OR moneta OR Münze) AND (Riga OR Ryga)",
  "(coin OR moneta OR Münze) AND (Cracow OR Kraków OR Krakau)",
  "(coin OR moneta OR Münze) AND (Warsaw OR Warszawa OR Varsovie)",
  "(coin OR moneta OR Münze) AND (Bydgoszcz OR Bromberg)",
  "(coin OR moneta OR Münze) AND (Olkusz OR Poznań OR Posen OR Wschowa)",
  "(coin OR moneta OR Münze) AND (Boleslaus OR Bolesław OR Mieszko)",
  "(coin OR moneta OR Münze) AND (Ladislaus OR Władysław OR Vladislaus)",
  "(coin OR moneta OR Münze) AND (Casimir OR Kazimierz OR Kasimir)",
  "(coin OR moneta OR Münze) AND (Sigismund OR Zygmunt)",
  "(coin OR moneta OR Münze) AND (Stephan OR Stefan Batory)",
  "(coin OR moneta OR Münze) AND (Johann Casimir OR Jan Kazimierz OR Ioannes Casimirus)",
  "(coin OR moneta OR Münze) AND (Johann Sobieski OR Jan Sobieski OR Ioannes Sobieski)",
  "(coin OR moneta OR Münze) AND (Stanislaus Augustus OR Stanisław August)",
  "(coin OR moneta OR Münze) AND (Augustus II OR August II OR Augustus III OR August III)",
  "(coin OR moneta OR Münze) AND (Piast OR Jagiellon OR Vasa OR Waza)",
  "(coin OR moneta OR Münze) AND (Kingdom of Poland OR Królestwo Polskie)",
  "(coin OR moneta OR Münze) AND (Polish Lithuanian Commonwealth OR Rzeczpospolita)",
  "(coin OR moneta OR Münze) AND (Duchy of Warsaw OR Księstwo Warszawskie)",
  "(coin OR moneta OR Münze) AND (Free City of Krakow OR Wolne Miasto Kraków)",
  "(coin OR moneta OR Münze) AND (Second Polish Republic OR II Rzeczpospolita)",
  "(coin OR moneta OR Münze) AND (Polish People's Republic OR Polska Rzeczpospolita Ludowa)",
  "(coin OR moneta OR Münze) AND (denar OR denarius OR bracteate OR brakteat)",
  "(coin OR moneta OR Münze) AND (grosz OR groschen OR schilling OR szeląg)",
  "(coin OR moneta OR Münze) AND (trojak OR 3 groschen OR szóstak OR 6 groschen)",
  "(coin OR moneta OR Münze) AND (ort OR 18 groschen OR thaler OR talar)",
  "(coin OR moneta OR Münze) AND (ducat OR dukat OR florin)",
  "(coin OR moneta OR Münze) AND (kopeck OR kopiejka OR ruble OR rubel)",
  "(coin OR moneta OR Münze) AND (mark OR marka OR fenig OR pfennig)",
  "(coin OR moneta OR Münze) AND (PRÓBA OR PROBA OR pattern OR essai OR probe)",
];

const POLISH_MARKERS = [
  "poland", "polska", "polish", "polonia", "polon", "polen", "pologne", "lenkija",
  "rzeczpospolita", "królestwo polskie", "kingdom of poland", "regni poloniae",
  "gdańsk", "gdansk", "danzig", "toruń", "torun", "thorn", "elbląg", "elblag",
  "elbing", "bydgoszcz", "bromberg", "olkusz", "wschowa", "fraustadt", "tykocin",
  "zygmunt", "sigismund", "kazimierz", "casimir", "bolesław", "boleslaus", "mieszko",
  "władysław", "ladislaus", "stefan batory", "stanisław august", "jan sobieski",
];

const RULERS = [
  [["mieszko i", "mieszko 1"], "Mieszko I"],
  [["boleslaus i", "bolesław i", "boleslaw i", "boleslaus the brave"], "Bolesław I Chrobry"],
  [["casimir iii", "kazimierz iii", "casimir the great"], "Kazimierz III Wielki"],
  [["ladislaus jagiello", "władysław jagiełło", "wladyslaw jagiello"], "Władysław II Jagiełło"],
  [["sigismund i", "zygmunt i", "sigismund the old"], "Zygmunt I Stary"],
  [["sigismund ii", "zygmunt ii", "sigismund augustus"], "Zygmunt II August"],
  [["stephan batory", "stefan batory", "stephanus"], "Stefan Batory"],
  [["sigismund iii", "zygmunt iii", "sigismund 3"], "Zygmunt III Waza"],
  [["zygmanto vazos", "zygimanto vazos"], "Zygmunt III Waza"],
  [["zygmanto senojo", "zygimanto senojo"], "Zygmunt I Stary"],
  [["zygmanto augusto", "zygimanto augusto"], "Zygmunt II August"],
  [["ladislaus iv", "władysław iv", "wladyslaw iv"], "Władysław IV Waza"],
  [["john ii casimir", "jan ii kazimierz", "jan kazimierz", "ioannes casim"], "Jan II Kazimierz"],
  [["jono kazimiero", "jono ii kazimiero"], "Jan II Kazimierz"],
  [["john iii sobieski", "jan iii sobieski", "jan sobieski"], "Jan III Sobieski"],
  [["augustus ii", "august ii"], "August II Mocny"],
  [["augustus iii", "august iii"], "August III Sas"],
  [["stanislaus augustus", "stanisław august", "stanislaw august"], "Stanisław August Poniatowski"],
];

const NOMINALS = [
  [/(?:^|\b)(?:double\s+thaler|2\s+thaler|dwutalar)(?:\b|$)/i, "Dwutalar"],
  [/(?:^|\b)(?:half\s+thaler|1\/2\s+thaler|półtalar|poltalar)(?:\b|$)/i, "Półtalar"],
  [/(?:^|\b)(?:thaler|taler|talar)(?:\b|$)/i, "Talar"],
  [/(?:^|\b)(?:ducat|dukat)(?:\b|$)/i, "Dukat"],
  [/(?:^|\b)(?:18\s+groschen|ort)(?:\b|$)/i, "Ort"],
  [/(?:^|\b)(?:30\s+grosz\w*|tymfa?|zlotas)(?:\b|$)/i, "Tymf"],
  [/(?:^|\b)(?:6\s+groschen|szóstak|szostak)(?:\b|$)/i, "Szóstak"],
  [/(?:^|\b)(?:4\s+groschen|czworak)(?:\b|$)/i, "Czworak"],
  [/(?:^|\b)(?:3\s+groschen|trojak)(?:\b|$)/i, "Trojak"],
  [/(?:^|\b)(?:3\s+gro(?:ș|s|şi|si|ši)|triplu\s+gros)(?:\b|$)/i, "Trojak"],
  [/(?:^|\b)(?:1\s*[½1/]2\s+gros|poltorak|póltorak|półtorak|dreipolker|poltură|poltura)(?:\b|$)/i, "Półtorak"],
  [/(?:^|\b)(?:1[.,½/]2\s+grosz|półgrosz|polgrosz)(?:\b|$)/i, "Półgrosz"],
  [/(?:^|\b)(?:½\s+gros|pusgrašis|pusgrasis)(?:\b|$)/i, "Półgrosz"],
  [/(?:^|\b)(?:grosz|groschen)(?:\b|$)/i, "Grosz"],
  [/(?:^|\b)(?:groș|gros|grašis|grasis)(?:\b|$)/i, "Grosz"],
  [/(?:^|\b)(?:schilling|szeląg|szelag)(?:\b|$)/i, "Szeląg"],
  [/(?:^|\b)(?:šilingas|silingas)(?:\b|$)/i, "Szeląg"],
  [/(?:^|\b)(?:dvidenaris|double\s+denar)(?:\b|$)/i, "Dwudenar"],
  [/(?:^|\b)(?:denarius|denar)(?:\b|$)/i, "Denar"],
  [/(?:^|\b)(?:bracteate|brakteat)(?:\b|$)/i, "Brakteat"],
  [/(?:^|\b)(?:kopeck|kopek|kopiejka)(?:\b|$)/i, "Kopiejka"],
  [/(?:^|\b)(?:ruble|rouble|rubel)(?:\b|$)/i, "Rubel"],
  [/(?:^|\b)(?:marka|mark)(?:\b|$)/i, "Marka"],
  [/(?:^|\b)(?:pfennig|fenig)(?:\b|$)/i, "Fenig"],
  [/(?:^|\b)(?:złotych|złoty|zloty)(?:\b|$)/i, "Złoty"],
  [/(?:^|\b)(?:forintas|forint)(?:\b|$)/i, "Floren"],
];

function clean(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalized(value) {
  return clean(value).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ł/g, "l");
}

function values(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.flatMap(values);
  if (typeof value === "object") return Object.values(value).flatMap(values);
  return [clean(value)].filter(Boolean);
}

function compactUnique(input, limit = 12) {
  return [...new Set(input.map(clean).filter(Boolean))].slice(0, limit);
}

function itemText(item) {
  return compactUnique([
    ...values(item.dcTitleLangAware), ...values(item.title), ...values(item.dcDescriptionLangAware),
    ...values(item.dcDescription), ...values(item.dcTypeLangAware), ...values(item.dcType),
    ...values(item.dcContributorLangAware), ...values(item.dcContributor), ...values(item.edmAgentLabelLangAware),
    ...values(item.dctermsSpatial), ...values(item.edmPlaceLabelLangAware), ...values(item.dataProvider),
  ], 120).join(" | ");
}

function polishRelated(text) {
  const n = normalized(text);
  return POLISH_MARKERS.some((marker) => n.includes(normalized(marker)));
}

function yearFrom(item, text) {
  const candidates = [...values(item.year), ...values(item.dcDate), ...values(item.dctermsCreated), text];
  for (const value of candidates) {
    const match = clean(value).match(/(?:^|\D)(9\d{2}|1\d{3}|20\d{2})(?:\D|$)/);
    if (match) return match[1];
  }
  return "";
}

function rulerFrom(text) {
  const n = normalized(text);
  for (const [aliases, ruler] of RULERS) {
    if (aliases.some((alias) => n.includes(normalized(alias)))) return ruler;
  }
  const agent = clean(text.split("|").find((part) => /king of poland|król polski|könig von polen/i.test(part)));
  return agent.slice(0, 120);
}

function nominalFrom(text) {
  for (const [pattern, nominal] of NOMINALS) if (pattern.test(text)) return nominal;
  return "";
}

function mintFrom(text) {
  const n = normalized(text);
  const mints = [
    [["gdansk", "danzig", "gedan"], "Gdańsk"], [["torun", "thorn"], "Toruń"],
    [["elblag", "elbing"], "Elbląg"], [["bydgoszcz", "bromberg"], "Bydgoszcz"],
    [["krakow", "cracow", "krakau"], "Kraków"], [["warszawa", "warsaw", "varsovie"], "Warszawa"],
    [["wilno", "vilnius", "vilna"], "Wilno"], [["ryga", "riga"], "Ryga"],
    [["poznan", "posen"], "Poznań"], [["wschowa", "fraustadt"], "Wschowa"],
    [["olkusz"], "Olkusz"], [["tykocin"], "Tykocin"], [["lipsk", "leipzig"], "Lipsk"],
  ];
  for (const [aliases, mint] of mints) {
    if (aliases.some((alias) => n.includes(alias))) return mint;
  }
  return "";
}

function metalFrom(item, text) {
  const n = normalized([...values(item.edmConceptPrefLabelLangAware), ...values(item.dcFormat), text].join(" "));
  if (/\b(gold|zloto|or|oro|aurum)\b/.test(n)) return "złoto";
  if (/\b(silver|srebro|argent|silber|argint)\b/.test(n)) return "srebro";
  if (/\b(copper|miedz|kupfer|cuivre|cupru)\b/.test(n)) return "miedź";
  if (/\b(bronze|braz|bronze|bronz)\b/.test(n)) return "brąz";
  if (/\b(nickel|nikiel)\b/.test(n)) return "nikiel";
  return "";
}

function legendFragments(item) {
  const descriptions = compactUnique([...values(item.dcDescriptionLangAware), ...values(item.dcDescription)], 30);
  const fragments = descriptions.filter((line) => /legend|legenda|inschrift|napis|avers|awers|obverse|revers|reverse/i.test(line));
  return compactUnique(fragments.map((line) => line.replace(/^.*?(?:legend\w*|inschrift|napis\w*)\s*:?\s*/i, "").slice(0, 180)), 6);
}

function objectKind(text) {
  return /\b(próba|proba|pattern|essai|probeprägung|probe)\b/i.test(text) ? "pattern-coin" : "coin";
}

function titleFor({ nominal, ruler, year, mint, objectKind: kind }) {
  const parts = [nominal || "Moneta", ruler, year, mint].filter(Boolean);
  if (kind === "pattern-coin") parts.splice(1, 0, "PRÓBA");
  return parts.join(", ");
}

function stableId(item) {
  const raw = clean(item.id || item.guid);
  return createHash("sha1").update(raw).digest("hex").slice(0, 20);
}

function normalizeItem(item) {
  const text = itemText(item);
  if (!polishRelated(text)) return null;
  const primaryTitle = clean(values(item.dcTitleLangAware)[0] || values(item.title)[0]);
  if (/\b(fals de epoc|counterfeit|forgery|imita(?:t|ț)|replika|kopia)\b/i.test(text)) return null;
  if (/^(?:auktions?|versteigerungs?|auctions?)[ -]?katalog|^katalog\s*\/|^sammlung\b.*\bauktion|^band\s+\d/i.test(primaryTitle)) return null;
  const nominal = nominalFrom(text);
  const extractedYear = yearFrom(item, text);
  // Europeana frequently puts the record creation/digitisation date in the
  // same fields as an object's historical date. PRL and current Polish issues
  // have dedicated legal/issuer pipelines, therefore a 1949+ Europeana value
  // is never accepted as a minting year without a separate object-level audit.
  const year = Number(extractedYear) >= 1949 ? "" : extractedYear;
  const ruler = rulerFrom(text);
  const mint = mintFrom(text);
  const legends = legendFragments(item);
  // A record with an exact denomination, date and Polish attribution still
  // narrows Stage 1 even when the provider omitted ruler or mint. Records
  // without a date are also useful when at least one independent identity
  // signal survives. Missing fields remain empty; ApoMonet must never invent
  // them merely to increase catalogue size.
  if (!nominal || ![year, ruler, mint, legends[0], legends[1]].some(Boolean)) return null;
  const kind = objectKind(text);
  const recordId = clean(item.id || item.guid);
  return {
    id: `europeana-meta:${stableId(item)}`,
    title: titleFor({ nominal, ruler, year, mint, objectKind: kind }),
    objectKind: kind,
    country: "Polska / ziemie historycznie polskie",
    ruler,
    year,
    sourceDateRejectedAsMintYear: year ? "" : extractedYear,
    nominal,
    metal: metalFrom(item, text),
    mint,
    shape: "round",
    weightGrams: null,
    diameterMm: null,
    portrait: "",
    obverseLegend: legends[0] || "",
    reverseLegend: legends[1] || "",
    diagnosticMarkers: compactUnique([
      kind === "pattern-coin" ? "napis PRÓBA lub oznaczenie emisji próbnej" : "",
      ...legends,
    ], 8),
    images: [],
    source: {
      type: "aggregated-museum-metadata",
      name: `Europeana — ${clean(values(item.dataProvider)[0] || values(item.provider)[0] || "dostawca zbiorów")}`,
      recordId,
      url: clean(item.guid || `https://www.europeana.eu/item${recordId}`),
      rights: "Europeana metadata CC0 1.0; media intentionally not imported",
      rightsCode: "factual-metadata-only",
      restricted: false,
      retrievedAt: RETRIEVED_AT,
    },
  };
}

async function sleep(ms) {
  await new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

async function fetchPage(query, cursor = "*", attempt = 1) {
  const url = new URL(API);
  url.searchParams.set("wskey", apiKey);
  url.searchParams.set("query", query);
  url.searchParams.set("rows", String(ROWS));
  url.searchParams.set("profile", "rich");
  url.searchParams.set("cursor", cursor);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { "User-Agent": "APOMONET-metadata-builder/1.0" } });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || body.success === false) throw new Error(body.error || `HTTP ${response.status}`);
    return body;
  } catch (error) {
    if (attempt >= 4) throw error;
    await sleep(500 * 2 ** attempt);
    return fetchPage(query, cursor, attempt + 1);
  } finally {
    clearTimeout(timeout);
  }
}

async function readCache() {
  if (refresh) return null;
  try { return JSON.parse(await readFile(CACHE, "utf8")); } catch { return null; }
}

async function discover() {
  const cached = await readCache();
  if (cached?.items?.length) {
    console.log(`[Europeana] cache: ${cached.items.length} unikalnych rekordów`);
    return cached;
  }
  const byId = new Map();
  const queryStats = [];
  for (const query of SEARCH_QUERIES) {
    let cursor = "*";
    let returned = 0;
    let reported = 0;
    for (let page = 1; page <= maxPages && cursor; page += 1) {
      const body = await fetchPage(query, cursor);
      reported = Number(body.totalResults) || reported;
      for (const item of body.items || []) {
        const id = clean(item.id || item.guid);
        if (!id) continue;
        returned += 1;
        if (!byId.has(id)) byId.set(id, item);
      }
      cursor = body.nextCursor || "";
      console.log(`[Europeana] ${query}: ${page}/${Math.min(maxPages, Math.ceil(reported / ROWS) || 1)}; unique=${byId.size}`);
      await sleep(90);
    }
    queryStats.push({ query, returned, reported });
  }
  const result = { schemaVersion: 1, retrievedAt: RETRIEVED_AT, queries: queryStats, items: [...byId.values()] };
  await mkdir(dirname(CACHE), { recursive: true });
  await writeFile(CACHE, `${JSON.stringify(result)}\n`, "utf8");
  return result;
}

const discovered = await discover();
const records = discovered.items.map(normalizeItem).filter(Boolean);
records.sort((a, b) => Number(a.year) - Number(b.year) || a.title.localeCompare(b.title, "pl"));
const catalog = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  sourcePolicy: {
    metadataLicense: "CC0 1.0",
    mediaImported: false,
    descriptionPolicy: "ApoMonet-generated identity title plus short factual legend fragments only",
    source: "https://pro.europeana.eu/page/available-apis",
  },
  stats: {
    discoveredUnique: discovered.items.length,
    acceptedRecords: records.length,
    rejectedRecords: discovered.items.length - records.length,
    withoutExactYear: records.filter((record) => !record.year).length,
    patternRecords: records.filter((record) => record.objectKind === "pattern-coin").length,
    withRuler: records.filter((record) => record.ruler).length,
    withMint: records.filter((record) => record.mint).length,
    withLegendFragments: records.filter((record) => record.obverseLegend || record.reverseLegend).length,
  },
  records,
};
await mkdir(dirname(OUTPUT), { recursive: true });
await writeFile(OUTPUT, gzipSync(`${JSON.stringify(catalog)}\n`, { level: 9 }));
console.log(JSON.stringify(catalog.stats, null, 2));
console.log(`[Europeana] zapisano ${OUTPUT}`);
