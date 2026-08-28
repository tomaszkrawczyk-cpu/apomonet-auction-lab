#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT = resolve(ROOT, "data/recognition/ikmk-polish-catalog-v1.json.gz");
const CACHE = resolve(ROOT, "data/recognition/build/ikmk-polish-json-v1.json");
const SEARCH_ORIGIN = "https://ikmk.net";
const RETRIEVED_AT = new Date().toISOString().slice(0, 10);
const CONCURRENCY = Math.max(1, Math.min(24, Number(process.env.IKMK_CONCURRENCY) || 12));
const SEARCH_CONCURRENCY = Math.max(1, Math.min(6, Number(process.env.IKMK_SEARCH_CONCURRENCY) || 4));
const SEARCHES = [
  { id: "country-poland", land_id: "57" },
  { id: "country-poland-uncertain", land_id: "58" },
  { id: "alexander-jagiellon", mherr_id: "4829" },
  { id: "augustus-ii", mherr_id: "356" },
  { id: "augustus-iii", mherr_id: "357" },
  { id: "boleslaw-chrobry", mherr_id: "6489" },
  { id: "boleslaw-ii", mherr_id: "4581" },
  { id: "boleslaw-iii", mherr_id: "401" },
  { id: "boleslaw-iv", mherr_id: "8786" },
  { id: "casimir-iii", mherr_id: "4827" },
  { id: "casimir-iv", mherr_id: "1022" },
  { id: "john-casimir", mherr_id: "922" },
  { id: "john-iii-sobieski", mherr_id: "13729" },
  { id: "mieszko-i", mherr_id: "4579" },
  { id: "mieszko-ii", mherr_id: "4580" },
  { id: "michal-korybut", mherr_id: "13730" },
  { id: "sigismund-i", mherr_id: "1401" },
  { id: "sigismund-ii", mherr_id: "1402" },
  { id: "sigismund-iii", mherr_id: "1403" },
  { id: "stanislaw-augustus", mherr_id: "1414" },
  { id: "stephen-bathory", mherr_id: "1420" },
  { id: "wladislaus-ii", mherr_id: "4828" },
  { id: "wladislaus-iii", mherr_id: "4763" },
  { id: "wladislaus-iv", mherr_id: "2185" },
];

function clean(value) {
  return String(value ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function number(value) {
  const parsed = Number(clean(value).replace(",", ".").match(/-?\d+(?:\.\d+)?/)?.[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

function first(value) {
  return Array.isArray(value) ? value[0] : value;
}

function year(value) {
  const parsed = clean(value).match(/\b(9\d{2}|1\d{3}|20\d{2})\b/)?.[1];
  return parsed || "";
}

function mapMetal(value) {
  const metal = clean(value).toLowerCase();
  if (/gold|golden|złoto/.test(metal)) return "złoto";
  if (/silver|silber|srebro/.test(metal)) return "srebro";
  if (/copper alloy|kupferlegierung|stop miedzi/.test(metal)) return "stop miedzi";
  if (/copper|kupfer|miedź/.test(metal)) return "miedź";
  if (/bronze|bronz|brąz/.test(metal)) return "brąz";
  if (/nickel|nikiel/.test(metal)) return "nikiel";
  if (/aluminium|aluminum/.test(metal)) return "aluminium";
  return clean(value);
}

function mapNominal(value) {
  const raw = clean(value);
  const nominal = raw.toLowerCase();
  const aliases = [
    [/\bquartensis\b/, "Kwartnik"], [/\bhalf\s*gros|\b1\/2\s*gros|\bpolgros/i, "Półgrosz"],
    [/\b3\s*gros|\btrojak/i, "Trojak"], [/\b4\s*gros|\bczworak/i, "Czworak"],
    [/\b6\s*gros|\bszostak/i, "Szóstak"], [/\b18\s*gros|\bort\b/i, "Ort"],
    [/\bgroschen|\bgrosz/i, "Grosz"], [/\bschilling|\bsolidus|\bszel/i, "Szeląg"],
    [/\bdenar|\bdenarius|\bpfennig/i, "Denar"], [/\bbracteate|\bbrakteat/i, "Brakteat"],
    [/\bdouble\s*(?:ducat|dukat)|\b2\s*(?:ducat|dukat)/i, "Dwudukat"],
    [/\bducat|\bdukat/i, "Dukat"], [/\bdouble\s*(?:taler|thaler)|\b2\s*(?:taler|thaler)/i, "Dwutalar"],
    [/\bhalf\s*(?:taler|thaler)|\b1\/2\s*(?:taler|thaler)/i, "Półtalar"],
    [/\btaler|\bthaler/i, "Talar"], [/\bzloty|\bzłot/i, "Złoty"],
    [/\bkope|\bkopiej/i, "Kopiejka"], [/\brubl|\broubl/i, "Rubel"], [/\bmark/i, "Marka"],
  ];
  return aliases.find(([pattern]) => pattern.test(nominal))?.[1] || raw;
}

function mapRuler(title) {
  const source = clean(title).replace(/^.*?:\s*/, "");
  const aliases = [
    [/sigismund iii|zygmunt iii/i, "Zygmunt III Waza"], [/sigismund ii|zygmunt ii/i, "Zygmunt II August"],
    [/sigismund i|zygmunt i/i, "Zygmunt I Stary"], [/stephen b[aá]thory|stefan batory/i, "Stefan Batory"],
    [/john casimir|johann kasimir|jan kazimierz/i, "Jan II Kazimierz"], [/john iii|jan iii|sobieski/i, "Jan III Sobieski"],
    [/wladislau?s iv|władysław iv/i, "Władysław IV Waza"], [/stanislaw augustus|stanisław august/i, "Stanisław August Poniatowski"],
    [/casimir iii|kazimierz iii/i, "Kazimierz III Wielki"], [/casimir iv|kazimierz iv/i, "Kazimierz IV Jagiellończyk"],
    [/mieszko i\b/i, "Mieszko I"], [/bolesl[aá]w|boleslav|boleslaus/i, clean(source.split(/[,.]/)[0])],
  ];
  return clean(aliases.find(([pattern]) => pattern.test(source))?.[1] || source.split(/[,.]/)[0]).slice(0, 180);
}

function licensedImages(json) {
  const right = clean(json.image_right?.short || first(json.avers)?.copyright?.short);
  if (!/^(?:PDM|CC0|CC BY(?:-SA)?)/i.test(right) || clean(json.image_restriction) !== "free") return [];
  return [
    [json.avers, "obverse"], [json.revers, "reverse"],
  ].flatMap(([side, label]) => {
    const item = first(side);
    const url = clean(item?.path_opt || item?.path_thumbnail);
    return url ? [{ url, side: label, rights: right, rightsUrl: clean(json.image_right?.url?.en || item?.copyright?.url) }] : [];
  });
}

function makeRecord(json, fallback = {}) {
  const title = clean(json.title || fallback.title);
  const nominal = mapNominal(json.nominal?.nominal_en || json.nominal?.nominal_de);
  const recordYear = year(json.year_start || json.date_verbal || title);
  const ruler = mapRuler(title);
  const mint = clean(first(json.mint)?.mint_name_en || first(json.mint)?.mint_name);
  if (!title || !nominal || !recordYear || !ruler) return null;
  const sourceUrl = clean(json.permalink || fallback.url).replace(/^http:/, "https:");
  const id = createHash("sha1").update(sourceUrl).digest("hex").slice(0, 20);
  const isPattern = /pattern|trial|essai|probe|pr[oó]ba/i.test(`${title} ${nominal}`);
  return {
    id: `ikmk:${id}`,
    title: [nominal, ruler, recordYear, mint].filter(Boolean).join(", "),
    objectKind: isPattern ? "pattern-coin" : "coin",
    country: clean(first(json.mint)?.country_name_en) || "Polska / ziemie historycznie polskie",
    ruler,
    year: recordYear,
    yearEnd: year(json.year_end),
    nominal,
    metal: mapMetal(json.material?.material_name_en || json.material?.material_name_de),
    mint,
    shape: "round",
    weightGrams: number(json.weight),
    diameterMm: number(json.diameter),
    portrait: "",
    obverseLegend: "",
    reverseLegend: "",
    diagnosticMarkers: [],
    images: licensedImages(json),
    source: {
      type: "museum-catalog-metadata",
      name: clean(json.publisher?.publisher_name) || "IKMK — network of numismatic collections",
      recordId: clean(json.ikmk_mds_id),
      url: sourceUrl,
      rights: "Structured facts and LOD identifiers; descriptions excluded. Image URL retained only for an explicit PDM/CC item.",
      rightsCode: "explicit-open-license",
      restricted: false,
      retrievedAt: RETRIEVED_AT,
    },
  };
}

async function request(url, options = {}, attempt = 1) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 50_000);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: { "User-Agent": "APOMONET-open-metadata-builder/1.0", ...(options.headers || {}) },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status} ${url}`);
    return response;
  } catch (error) {
    if (attempt >= 3) throw error;
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 750 * 2 ** attempt));
    return request(url, options, attempt + 1);
  } finally {
    clearTimeout(timeout);
  }
}

async function startSearch(search) {
  const initial = await request(`${SEARCH_ORIGIN}/extended_search?lang=en`);
  const cookie = initial.headers.get("set-cookie")?.match(/PHPSESSID=([^;]+)/)?.[1];
  if (!cookie) throw new Error("IKMK did not issue a search session");
  const body = new URLSearchParams({
    jahr_von: "-650", jahr_bis: "2026", land_id: search.land_id || "0", location_id: "0", sachbegriff_id: "1",
    nominal_id: "0", mherr_id: search.mherr_id || "0", sitter_id: "0", mstand_id: "0", material_id: "0",
    salesman_id: "0", prevowner_id: "0", persontype_id: "0", search_person_id: "0", lang: "en",
  });
  const response = await request(`${SEARCH_ORIGIN}/search_ajax_extended.php`, {
    method: "POST", body, headers: { Cookie: `PHPSESSID=${cookie}`, "Content-Type": "application/x-www-form-urlencoded" },
  });
  const html = await response.text();
  const reported = Number(clean(html.match(/([\d.]+)\s+show results/i)?.[1]).replace(/\./g, "")) || 0;
  return { cookie, reported };
}

function parseTray(html) {
  const leads = [];
  for (const match of html.matchAll(/<a href='(https?:\/\/[^']+\/object\?id=[^']+)' title='([^']*)'/g)) {
    leads.push({ url: match[1].replace(/&amp;/g, "&"), title: clean(match[2]) });
  }
  const next = html.match(/<a href='\?lang=en&id=([^']+)' aria-label='Next'>/)?.[1] || "";
  return { leads, next };
}

async function collectLeads(cookie, label) {
  const leads = [];
  let cursor = "";
  const seenCursors = new Set();
  do {
    const url = new URL(`${SEARCH_ORIGIN}/tray`);
    url.searchParams.set("lang", "en");
    // IKMK treats `range` as a list-setting action and resets the cursor when
    // it is sent again. Set it only on the first request, then follow opaque
    // `id` cursors exactly as returned by the catalogue.
    if (!cursor) url.searchParams.set("range", "100");
    if (cursor) url.searchParams.set("id", cursor);
    const response = await request(url, { headers: { Cookie: `PHPSESSID=${cookie}` } });
    const page = parseTray(await response.text());
    leads.push(...page.leads);
    console.log(`[IKMK] ${label}: lista ${leads.length}`);
    if (!page.next || seenCursors.has(page.next)) break;
    seenCursors.add(page.next);
    cursor = page.next;
  } while (true);
  return [...new Map(leads.map((lead) => [lead.url, lead])).values()];
}

async function collectAllLeads() {
  let position = 0;
  const results = [];
  async function worker() {
    while (position < SEARCHES.length) {
      const search = SEARCHES[position++];
      const session = await startSearch(search);
      const leads = await collectLeads(session.cookie, search.id);
      results.push({ search: search.id, reported: session.reported, discovered: leads.length, leads });
      console.log(`[IKMK] ${search.id}: raportowane=${session.reported}, dostępne=${leads.length}`);
    }
  }
  await Promise.all(Array.from({ length: SEARCH_CONCURRENCY }, () => worker()));
  return results;
}

async function loadCache() {
  try {
    return JSON.parse(await readFile(CACHE, "utf8"));
  } catch {
    return {};
  }
}

async function enrichLeads(leads) {
  const cache = await loadCache();
  let position = 0;
  let completed = 0;
  async function worker() {
    while (position < leads.length) {
      const lead = leads[position++];
      if (!cache[lead.url]) {
        try {
          const separator = lead.url.includes("?") ? "&" : "?";
          cache[lead.url] = await (await request(`${lead.url}${separator}download=json_ext`)).json();
        } catch (error) {
          cache[lead.url] = { _error: clean(error?.message), title: lead.title, permalink: lead.url };
        }
      }
      completed += 1;
      if (completed % 50 === 0 || completed === leads.length) {
        console.log(`[IKMK] metadane: ${completed}/${leads.length}`);
        await mkdir(dirname(CACHE), { recursive: true });
        await writeFile(CACHE, `${JSON.stringify(cache)}\n`);
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
  return leads.map((lead) => ({ lead, json: cache[lead.url] })).filter(({ json }) => !json?._error);
}

const searchResults = await collectAllLeads();
const leads = [...new Map(searchResults.flatMap((result) => result.leads).map((lead) => [lead.url, lead])).values()];
const enriched = await enrichLeads(leads);
const records = enriched.map(({ lead, json }) => makeRecord(json, lead)).filter(Boolean);
const uniqueRecords = [...new Map(records.map((record) => [record.source.url, record])).values()]
  .sort((a, b) => Number(a.year) - Number(b.year) || a.title.localeCompare(b.title, "pl"));
const catalog = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  sourcePolicy: {
    metadataLicense: "IKMK structured facts/LOD; catalogue text CC BY-SA 4.0; per-item image rights",
    descriptionsImported: false,
    mediaDownloaded: false,
    source: "https://ikmk.net/about?lang=en",
  },
  stats: {
    reportedResults: searchResults.reduce((sum, result) => sum + result.reported, 0),
    discoveredRecords: leads.length,
    acceptedRecords: uniqueRecords.length,
    rejectedRecords: leads.length - uniqueRecords.length,
    patternRecords: uniqueRecords.filter((record) => record.objectKind === "pattern-coin").length,
    recordsWithOpenImages: uniqueRecords.filter((record) => record.images.length >= 2).length,
    withMint: uniqueRecords.filter((record) => record.mint).length,
    withMetrology: uniqueRecords.filter((record) => record.weightGrams || record.diameterMm).length,
  },
  searches: searchResults.map(({ leads: _leads, ...result }) => result),
  records: uniqueRecords,
};
await mkdir(dirname(OUTPUT), { recursive: true });
await writeFile(OUTPUT, gzipSync(`${JSON.stringify(catalog)}\n`, { level: 9 }));
console.log(JSON.stringify(catalog.stats, null, 2));
console.log(`[IKMK] zapisano ${OUTPUT}`);
