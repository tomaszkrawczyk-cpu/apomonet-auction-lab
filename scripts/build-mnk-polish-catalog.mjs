#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync, gzipSync } from "node:zlib";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BUILD_DIR = resolve(ROOT, "data/recognition/build");
const SEARCH_CACHE = resolve(BUILD_DIR, "mnk-polish-search-v1.json");
const DETAIL_CACHE = resolve(BUILD_DIR, "mnk-polish-details-v1.json");
const OUTPUT = resolve(ROOT, "data/recognition/mnk-polish-catalog-v1.json.gz");
const API = "https://api-zbiory.mnk.pl";
const PAGE_SIZE = 1000;
const SEARCH_CONCURRENCY = 3;
const DETAIL_CONCURRENCY = 6;
const RETRIEVED_AT = new Date().toISOString().slice(0, 10);

const args = new Set(process.argv.slice(2));
const refresh = args.has("--refresh");
const discoverOnly = args.has("--discover-only");
const maxDetailsArg = process.argv.find((value) => value.startsWith("--max-details="));
const maxDetails = maxDetailsArg ? Number(maxDetailsArg.split("=")[1]) : Infinity;

const SEARCH_QUERIES = [
  "moneta polska",
  "moneta piastowska",
  "brakteat polski",
  "Księstwo Warszawskie moneta",
  "Królestwo Polskie moneta",
  "Wolne Miasto Kraków moneta",
  "Powstanie Listopadowe moneta",
  "Galicja i Lodomeria moneta",
  "Prusy Południowe moneta",
  "Wielkie Księstwo Poznańskie moneta",
  "niemieckie władze okupacyjne Królestwa Polskiego moneta",
  "półgrosz grosz szeląg kopiejka marka trojak czworak szóstak półtalar",
  "II Rzeczpospolita moneta",
  "Polska Rzeczpospolita Ludowa moneta",
  "Rzeczpospolita Polska moneta",
];

const POLISH_RULERS = [
  "Mieszko I",
  "Bolesław I Chrobry",
  "Mieszko II Lambert",
  "Kazimierz I Odnowiciel",
  "Bolesław II Śmiały",
  "Władysław I Herman",
  "Bolesław III Krzywousty",
  "Władysław II Wygnaniec",
  "Bolesław IV Kędzierzawy",
  "Mieszko III Stary",
  "Kazimierz II Sprawiedliwy",
  "Leszek Biały",
  "Władysław III Laskonogi",
  "Henryk I Brodaty",
  "Henryk II Pobożny",
  "Bolesław V Wstydliwy",
  "Leszek Czarny",
  "Henryk IV Probus",
  "Przemysł II",
  "Wacław II",
  "Władysław I Łokietek",
  "Kazimierz III Wielki",
  "Ludwik Węgierski",
  "Jadwiga Andegaweńska",
  "Władysław II Jagiełło",
  "Władysław III Warneńczyk",
  "Kazimierz IV Jagiellończyk",
  "Jan I Olbracht",
  "Aleksander Jagiellończyk",
  "Zygmunt I Stary",
  "Zygmunt II August",
  "Henryk Walezy",
  "Stefan Batory",
  "Zygmunt III Waza",
  "Władysław IV Waza",
  "Jan II Kazimierz",
  "Michał Korybut Wiśniowiecki",
  "Jan III Sobieski",
  "August II Mocny",
  "Stanisław Leszczyński",
  "August III Sas",
  "Stanisław August Poniatowski",
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
    .replace(/[^a-z0-9½]+/g, " ")
    .trim();
}

function sleep(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

async function fetchJson(url, options = {}, attempt = 1) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "APOMONET-source-catalog/1.0",
        ...(options.headers || {}),
      },
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || Number(body?.status || 200) >= 400) {
      if (body?.message === "NO_RESULTS_FOR_GIVEN_QUERY") {
        return { data: { items: [], paginatorDetails: { totalPagesCount: 0, totalItemsCount: 0 } } };
      }
      throw new Error(body?.message || `HTTP ${response.status}`);
    }
    return body;
  } catch (error) {
    if (attempt >= 4) throw error;
    await sleep(750 * 2 ** (attempt - 1));
    return fetchJson(url, options, attempt + 1);
  } finally {
    clearTimeout(timeout);
  }
}

async function mapLimit(values, limit, mapper) {
  const output = new Array(values.length);
  let cursor = 0;
  async function worker() {
    while (cursor < values.length) {
      const index = cursor++;
      output[index] = await mapper(values[index], index);
      await sleep(80);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, values.length) }, worker));
  return output;
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

async function writeGzipJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, gzipSync(`${JSON.stringify(value)}\n`, { level: 9 }));
}

async function readGzipJson(path, fallback) {
  try {
    return JSON.parse(gunzipSync(await readFile(path)).toString("utf8"));
  } catch {
    return fallback;
  }
}

async function queryPage(phrase, page) {
  return fetchJson(`${API}/api/query/page/${page}?maxPerPage=${PAGE_SIZE}&sort=score`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phrase }),
  });
}

async function discover() {
  const cached = !refresh && (await readJson(SEARCH_CACHE, null));
  if (cached?.items?.length) {
    console.log(`[discover] cache: ${cached.items.length} unikalnych obiektów`);
    return cached;
  }
  const byId = new Map();
  const queryStats = [];
  for (const phrase of SEARCH_QUERIES) {
    let first;
    try {
      first = await queryPage(phrase, 1);
    } catch (error) {
      if (String(error?.message || error).includes("NO_RESULTS_FOR_GIVEN_QUERY")) {
        queryStats.push({ phrase, returned: 0, reported: 0 });
        console.log(`[discover] ${phrase}: 0 wyników`);
        continue;
      }
      throw error;
    }
    const details = first?.data?.paginatorDetails || {};
    const pages = Math.max(1, Number(details.totalPagesCount) || 1);
    const pageNumbers = Array.from({ length: pages - 1 }, (_, index) => index + 2);
    const rest = await mapLimit(pageNumbers, SEARCH_CONCURRENCY, async (page) => {
      const result = await queryPage(phrase, page);
      console.log(`[discover] ${phrase}: strona ${page}/${pages}`);
      return result;
    });
    const results = [first, ...rest];
    let count = 0;
    for (const result of results) {
      for (const item of result?.data?.items || []) {
        if (!item?.id) continue;
        count += 1;
        if (!byId.has(item.id)) byId.set(item.id, item);
      }
    }
    queryStats.push({ phrase, returned: count, reported: Number(details.totalItemsCount) || count });
    console.log(`[discover] ${phrase}: ${count} wyników; łącznie ${byId.size} unikalnych`);
  }
  const result = {
    schemaVersion: 1,
    retrievedAt: RETRIEVED_AT,
    source: "Muzeum Narodowe w Krakowie — publiczne API zbiorów cyfrowych",
    queries: queryStats,
    items: [...byId.values()],
  };
  await writeJson(SEARCH_CACHE, result);
  return result;
}

function typeNames(record) {
  return (record?.types || []).map((item) => normalized(`${item?.hierarchy || ""} ${item?.name || ""}`));
}

function isCoin(record) {
  const title = normalized(record?.title);
  const types = typeNames(record).join(" ");
  const coinWords = /\b(monet|denar|brakteat|dukat|talar|grosz|groszy|szelag|trojak|szostak|ort|zlot|fenig|halerz|kwartnik|poltorak|solid)\w*\b/;
  return types.includes("monet") || coinWords.test(title);
}

function excludedObject(record) {
  const value = normalized(`${record?.title || ""} ${typeNames(record).join(" ")}`);
  return /\b(medal|zeton|plakiet|banknot|order|odznak|odwaznik|pieczec|kopia|falszyw|falszer|falsyfikat|replika|nasladownictwo|fantazyjn|stempel do wybijania|szkic|rysunek|plansza|etui|kolia|spinka|przerys|oprawion|kompozycja malarska)\w*\b|\b(moneta zastepcza|nowe bicie|monety rozne|jednostronna odbitka|monety greckie|monety uzywane do)\b/.test(value);
}

function authorsText(record) {
  return (record?.authors || []).map((item) => `${item?.name || ""} ${item?.role || ""}`).join(" ");
}

function isPolish(record) {
  const title = normalized(record?.title);
  const issuer = normalized(
    (record?.authors || [])
      .filter((item) => /wladc|emitent/.test(normalized(item?.role)))
      .map((item) => item?.name)
      .join(" "),
  );
  const places = normalized(
    (record?.createPlaces || []).flatMap((item) => [item?.name, item?.hierarchy]).join(" "),
  );
  const value = `${title} ${issuer} ${places}`;
  const ruler = POLISH_RULERS.some((name) => `${title} ${issuer}`.includes(normalized(name)));
  const realm = /\b(pols|koronn|rzeczpospolit|ksiestwo warszaw|krolestwo polsk|wolne miasto krak|powstanie listopad|galicj|lodomeri|prusy poludniow|prusy wschodni|prusy zachodni|wielkie ksiestwo poznan|ober ost|prl|gdansk|danzig|elblag|elbing|torun|thorn|bydgoszcz|krakow|poznan|wilno|vilnius|litew|ryga|riga)\w*\b/.test(value);
  const year = Number(yearFrom(record));
  if (year >= 1918) {
    const modernIssuer = /\b(rzeczpospolita polska|polska rzeczpospolita ludowa|narodowy bank polski|nbp|wolne miasto gdansk|okupacja niemiecka)\b/.test(`${title} ${issuer}`);
    const polishCurrency = /\b(zlot\w*|zl|grosz\w*|gr)\b/.test(title);
    const polishPlace = /\b(pols\w*|warszaw\w*)\b/.test(places);
    return modernIssuer || (polishCurrency && polishPlace);
  }
  return ruler || realm;
}

function yearFrom(record) {
  const title = clean(record?.title);
  const maximum = new Date().getUTCFullYear() + 1;
  const tokens = [];
  for (const match of title.matchAll(/\b(9\d{2}|1\d{3}|20\d{2})\s*[–-]\s*(\d{2,4})\b/g)) {
    const start = Number(match[1]);
    const suffix = clean(match[2]);
    const end = suffix.length < 4 ? Number(`${String(start).slice(0, 4 - suffix.length)}${suffix}`) : Number(suffix);
    if (start >= 900 && start <= maximum && end >= start && end <= maximum) {
      tokens.push({ index: match.index + match[0].length, value: start === end ? String(start) : `${start}–${end}` });
    }
  }
  for (const match of title.matchAll(/\b(9\d{2}|1\d{3}|20\d{2})\b/g)) {
    const value = Number(match[1]);
    if (value >= 900 && value <= maximum) tokens.push({ index: match.index, value: String(value) });
  }
  tokens.sort((a, b) => b.index - a.index || b.value.length - a.value.length);
  if (tokens[0]?.value) return tokens[0].value;
  const fallback = clean(record?.createDates?.[0]?.name);
  const match = fallback.match(/\b(9\d{2}|1\d{3}|20\d{2})\b/);
  return match ? match[1] : "";
}

function authorByRole(record, pattern) {
  return (record?.authors || []).find((item) => pattern.test(normalized(item?.role)));
}

function mintFrom(record) {
  const author = authorByRole(record, /mennic|wytworn/);
  if (author?.name) {
    const value = clean(author.name).replace(/^Mennica\s+/i, "");
    if (/^Polska(?:\s+S\.A\.)?/i.test(value)) return "Warszawa";
    return value;
  }
  const value = normalized(record?.title);
  const mints = [
    ["Gdańsk", /\b(gdansk|danzig)\b/],
    ["Elbląg", /\b(elblag|elbing)\b/],
    ["Toruń", /\b(torun|thorn)\b/],
    ["Bydgoszcz", /\bbydgoszcz\b/],
    ["Kraków", /\bkrakow\b/],
    ["Poznań", /\bpoznan\b/],
    ["Wschowa", /\bwschowa\b/],
    ["Olkusz", /\bolkusz\b/],
    ["Wilno", /\bwilno\b/],
    ["Ryga", /\bryga\b/],
    ["Warszawa", /\bwarszaw\w*\b/],
  ];
  return mints.find(([, pattern]) => pattern.test(value))?.[0] || "";
}

function rulerFrom(record) {
  const author = authorByRole(record, /wladc|emitent/);
  if (author?.name && !/^mennica\b/i.test(clean(author.name))) return clean(author.name);
  const title = normalized(record?.title);
  const ruler = POLISH_RULERS.find((name) => title.includes(normalized(name)));
  if (ruler) return ruler;
  if (/\bpolska rzeczpospolita ludowa\b/.test(title)) return "Polska Rzeczpospolita Ludowa";
  if (/\brzeczpospolita polska\b/.test(title)) return "Rzeczpospolita Polska";
  if (/\bkrolestwo polskie\b/.test(title)) return "Królestwo Polskie";
  if (/\bksiestwo warszawskie\b/.test(title)) return "Księstwo Warszawskie";
  return "";
}

function nominalFrom(title) {
  const value = normalized(title);
  if (/\btrzy ruble dwadziescia zlot\w*\b/.test(value)) return "20 zł / 3 ruble";
  const numeric = value.match(/\b(\d{1,3}(?:\s\d{3})*)\s+(grosz|grosze|groszy|gr|zloty|zlote|zlotych|zltych|zl)\b/);
  if (numeric) {
    const unit = numeric[2].startsWith("grosz") || numeric[2] === "gr" ? "gr" : "zł";
    return `${numeric[1].replace(/\s/g, "")} ${unit}`;
  }
  const wordAmounts = new Map([
    ["pol", "½"],
    ["jeden", "1"],
    ["jedna", "1"],
    ["dwie", "2"],
    ["dwa", "2"],
    ["trzy", "3"],
    ["cztery", "4"],
    ["piec", "5"],
    ["szesc", "6"],
    ["dziesiec", "10"],
    ["dwadziescia", "20"],
    ["dwadziescia piec", "25"],
  ]);
  const historicUnit = value.match(/\b(½|\d{1,3}|dwadziescia piec|dwadziescia|dziesiec|szesc|piec|cztery|trzy|dwie|dwa|jedna|jeden|pol)\s+(kopiej\w*|fenig\w*|mark\w*|rubl\w*|rubel\w*|krajcar\w*)\b/);
  if (historicUnit) {
    const amount = wordAmounts.get(historicUnit[1]) || historicUnit[1];
    const unit = historicUnit[2];
    if (unit.startsWith("kopiej")) return amount === "½" ? "½ kopiejki" : amount === "1" ? "1 kopiejka" : ["2", "3", "4"].includes(amount) ? `${amount} kopiejki` : `${amount} kopiejek`;
    if (unit.startsWith("fenig")) return amount === "1" ? "1 fenig" : `${amount} fenigów`;
    if (unit.startsWith("mark")) return amount === "½" ? "½ marki" : amount === "1" ? "1 marka" : ["2", "3", "4"].includes(amount) ? `${amount} marki` : `${amount} marek`;
    if (unit.startsWith("rub")) return amount === "½" ? "½ rubla" : amount === "1" ? "1 rubel" : ["2", "3", "4"].includes(amount) ? `${amount} ruble` : `${amount} rubli`;
    if (unit.startsWith("krajcar")) return amount === "1" ? "1 krajcar" : `${amount} krajcarów`;
  }
  const patterns = [
    [/\b100 bez nazwy nominal\w*\b/, "100 (próba bez nazwy nominału)"],
    [/\b50 bez nazwy mark\w*\b/, "50 marek (próba)"],
    [/\b½ rubel\w*\b|\b1 2 rubel\w*\b/, "½ rubla"],
    [/\bdziesie?c zlot\w*\b/, "10 zł"],
    [/\bpiec zlot\w*\b/, "5 zł"],
    [/\bdwa zlot\w*\b/, "2 zł"],
    [/\bjeden zlot\w*\b/, "1 zł"],
    [/\bportugal\w*\b/, "Portugał"],
    [/\bpolportugal\w*\b/, "Półportugał"],
    [/\bpolryal\w*\b/, "Półryal"],
    [/\baugustdor\w*\b/, "Augustdor"],
    [/\bczworodukat\w*\b|\b4 dukat\w*\b/, "Czworodukat"],
    [/\btrzydukat\w*\b|\b3 dukat\w*\b/, "Trzydukat"],
    [/\bdwudukat\w*\b|\b2 dukat\w*\b/, "Dwudukat"],
    [/\bpoldukat\w*\b/, "Półdukat"],
    [/\bdukat\w*\b|\bdukac\w*\b/, "Dukat"],
    [/\bdwutalar\w*\b|\b2 talar\w*\b/, "Dwutalar"],
    [/\bpoltalar\w*\b|\b1 2 talar\w*\b/, "Półtalar"],
    [/\bcwierctalar\w*\b/, "Ćwierćtalar"],
    [/\btalar\w*\b/, "Talar"],
    [/\bort\w*\b/, "Ort"],
    [/\bszostak\w*\b/, "Szóstak"],
    [/\btrojak\w*\b/, "Trojak"],
    [/\bpoltorak\w*\b/, "Półtorak"],
    [/\bczworak\w*\b/, "Czworak"],
    [/\bdwojak\w*\b/, "Dwojak"],
    [/\btrzeciak\w*\b/, "Trzeciak"],
    [/\bternar\w*\b/, "Ternar"],
    [/\bdwugrosz\w*\b/, "Dwugrosz"],
    [/\bdwuzlotow\w*\b/, "Dwuzłotówka"],
    [/\bzlotow\w*\b/, "Złotówka"],
    [/\bpolgrosz\w*\b/, "Półgrosz"],
    [/\bgrosz\w*\b/, "Grosz"],
    [/\bszelag\w*\b|\bsolidus\w*\b|\bsolid\b/, "Szeląg"],
    [/\bmark\w*\b/, "1 marka"],
    [/\bferding\w*\b/, "Ferding"],
    [/\bgulden\w*\b/, "Gulden"],
    [/\bkrajcar\w*\b/, "1 krajcar"],
    [/\brubel\w*\b/, "1 rubel"],
    [/\bpoltin\w*\b/, "Połtina"],
    [/\bkopiej\w*\b/, "1 kopiejka"],
    [/\bdwudenar\w*\b/, "Dwudenar"],
    [/\bpieniadz\w*\b/, "Pieniądz"],
    [/\bpolskojec\w*\b/, "Półskojec"],
    [/\bpulo\b/, "Puło"],
    [/\bd.*niez\w*\b/, "Dienieżka"],
    [/\bpoluszk\w*\b/, "Połuszka"],
    [/\bdirham\w*\b/, "Dirham z kontrasygnatą"],
    [/\bkwartnik\w*\b/, "Kwartnik"],
    [/\bbrakteat\w*\b/, "Brakteat"],
    [/\bdenar\w*\b/, "Denar"],
    [/\bfenig\w*\b/, "1 fenig"],
    [/\bhalerz\w*\b/, "Halerz"],
  ];
  return patterns.find(([pattern]) => pattern.test(value))?.[1] || "";
}

function materialFrom(record) {
  return clean(record?.materials?.[0]?.name);
}

function summaryKey(record) {
  const title = normalized(record?.title).replace(/\b\d{4}\s+\d{4}\b/g, "");
  return [title, yearFrom(record), normalized(rulerFrom(record)), normalized(mintFrom(record)), normalized(materialFrom(record))].join("|");
}

function shortlist(items) {
  const filtered = items.filter((item) => isCoin(item) && !excludedObject(item) && isPolish(item));
  const groups = new Map();
  for (const item of filtered) {
    const key = summaryKey(item);
    if (!groups.has(key)) groups.set(key, item);
  }
  return { filtered, representatives: [...groups.values()] };
}

async function collectDetails(representatives) {
  const cached = !refresh ? await readJson(DETAIL_CACHE, { records: {} }) : { records: {} };
  const records = new Map(Object.entries(cached?.records || {}));
  const pending = representatives
    .filter((item) => !records.has(String(item.id)))
    .slice(0, Number.isFinite(maxDetails) ? maxDetails : undefined);
  console.log(`[details] cache ${records.size}; do pobrania ${pending.length}`);
  let completed = 0;
  await mapLimit(pending, DETAIL_CONCURRENCY, async (item) => {
    try {
      const payload = await fetchJson(`${API}/api/object/${item.id}`);
      records.set(String(item.id), payload?.data || null);
    } catch (error) {
      records.set(String(item.id), { id: item.id, importError: clean(error?.message) });
    }
    completed += 1;
    if (completed % 25 === 0 || completed === pending.length) {
      console.log(`[details] ${completed}/${pending.length}`);
      await writeJson(DETAIL_CACHE, {
        schemaVersion: 1,
        retrievedAt: RETRIEVED_AT,
        records: Object.fromEntries(records),
      });
    }
  });
  return representatives.map((item) => records.get(String(item.id))).filter(Boolean);
}

function publicDomain(record) {
  return (record?.copyrights || []).find(
    (item) => normalized(item?.name) === "domena publiczna" && item?.restricted === false,
  );
}

function dimension(record, label) {
  const row = (record?.sizes || [])
    .flatMap((item) => item?.dimensions || [])
    .find((item) => normalized(item?.name) === label);
  const match = clean(row?.value).match(/\d+(?:[.,]\d+)?/);
  return match ? Number(match[0].replace(",", ".")) : null;
}

function htmlText(value) {
  return clean(value)
    .replace(/<br\s*\/?>/gi, " | ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&nbsp;/gi, " ")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function standardizedPortrait(record) {
  const description = normalized(htmlText(record?.description));
  const features = [];
  if (/\b(popiersie|glowa|polpostac|postac)\b/.test(description)) features.push("Wizerunek władcy lub emitenta");
  if (/\bw prawo\b/.test(description)) features.push("zwrócony w prawo");
  else if (/\bw lewo\b/.test(description)) features.push("zwrócony w lewo");
  if (/\bkoron\w*\b/.test(description)) features.push("w koronie");
  if (/\bzbroj\w*\b/.test(description)) features.push("w zbroi");
  if (/\bprofil\w*\b/.test(description)) features.push("ujęcie profilowe");
  return features.join(", ");
}

function standardizedMarkers(record) {
  const description = normalized(htmlText(record?.description));
  const markers = [
    [/\borzel\w*\b/, "orzeł"],
    [/\bpogon\w*\b/, "Pogoń"],
    [/\bherb gdansk\w*\b/, "herb Gdańska"],
    [/\bherb elblag\w*\b/, "herb Elbląga"],
    [/\bherb torun\w*\b/, "herb Torunia"],
    [/\blw\w*\b|\blew\w*\b/, "lwy"],
    [/\baniol\w*\b/, "anioł"],
    [/\btarcz\w*\b/, "tarcza herbowa"],
    [/\bmonogram\w*\b/, "monogram"],
    [/\bkoron\w*\b/, "korona"],
    [/\bznak mennic\w*\b|\bznak mincer\w*\b/, "znak menniczy lub mincerski"],
    [/\bproba\b/, "napis PRÓBA"],
  ];
  return markers.filter(([pattern]) => pattern.test(description)).map(([, label]) => label).slice(0, 8);
}

function imageUrl(image) {
  if (!image?.filePath || !image?.extension) return "";
  return `https://cdn-zbiory.mnk.pl/upload/cache/multimedia_detail/${image.filePath}.${image.extension}`;
}

function countryFrom(record) {
  const place = record?.createPlaces?.[0];
  return clean(place?.hierarchy || place?.name || "Polska").replace(/^Europa\s*\/\s*/i, "");
}

function shapeFrom(record) {
  const value = normalized(`${record?.title || ""} ${htmlText(record?.description)}`);
  if (/\b(klipa|klippe|kwadrat)\w*\b/.test(value)) return "square-klippe";
  if (/\bprostokat\w*\b/.test(value)) return "rectangular";
  return "round";
}

function periodFor(record, year) {
  const value = Number(clean(year).match(/\b\d{3,4}\b/)?.[0]);
  if (!value) return "undated";
  const context = normalized(`${record?.title || ""} ${(record?.createPlaces || []).map((item) => `${item?.name || ""} ${item?.hierarchy || ""}`).join(" ")}`);
  if (
    value >= 1772 && value <= 1918 &&
    /\b(zabor|galicj|lodomeri|prusy poludniow|prusy wschodni|prusy zachodni|ksiestwo warszaw|krolestwo polsk|wolne miasto krak|powstanie listopad|wielkie ksiestwo poznan|ober ost|niemieck\w* wladz\w* okupacyjn)\w*\b/.test(context)
  ) return "partitions-and-uprisings";
  if (value < 1386) return "medieval-piast";
  if (value <= 1572) return "jagiellonian";
  if (value <= 1795) return "elective-monarchy";
  if (value <= 1918) return "partitions-and-uprisings";
  if (value <= 1945) return "second-republic-and-war";
  if (value <= 1989) return "people-republic";
  return "third-republic";
}

function objectKind(record) {
  return /\bproba\b/.test(normalized(record?.title)) ? "pattern" : "coin";
}

function transform(record) {
  const rights = publicDomain(record);
  if (!record?.id || record?.importError || !rights || !isCoin(record) || excludedObject(record) || !isPolish(record)) return null;
  const year = yearFrom(record);
  const title = clean(record.title);
  const nominal = nominalFrom(title);
  if (!nominal) return null;
  const images = [imageUrl(record.image), ...(record.additionalImages || []).map(imageUrl)].filter(Boolean).slice(0, 4);
  const mint = mintFrom(record);
  const sourceReference = clean(record.noEvidence || record.inventoryNumber);
  return {
    id: `mnk:${record.id}`,
    title,
    objectKind: objectKind(record),
    country: countryFrom(record),
    ruler: rulerFrom(record),
    year,
    period: periodFor(record, year),
    nominal,
    metal: materialFrom(record),
    mint,
    shape: shapeFrom(record),
    weightGrams: dimension(record, "waga"),
    diameterMm: dimension(record, "srednica"),
    portrait: standardizedPortrait(record),
    obverseLegend: "",
    reverseLegend: "",
    diagnosticMarkers: standardizedMarkers(record),
    images,
    source: {
      type: "museum",
      name: "Muzeum Narodowe w Krakowie",
      recordId: sourceReference,
      url: `https://zbiory.mnk.pl/pl/katalog/${record.id}`,
      apiUrl: `${API}/api/object/${record.id}`,
      retrievedAt: RETRIEVED_AT,
      rights: clean(rights.name),
      rightsCode: "public-domain",
      restricted: false,
      accessMode: "public-api-item-level-rights-check",
    },
  };
}

function canonicalTypeKey(record) {
  const title = normalized(record.title)
    .replace(/\b\d{4}\s+\d{4}\b/g, "")
    .replace(/\bmoneta\b/g, "")
    .trim();
  return [normalized(record.ruler), record.year, normalized(record.nominal), normalized(record.mint), normalized(record.metal), normalized(record.shape), title].join("|");
}

function qualityScore(record) {
  return [record.ruler, record.year, record.nominal, record.mint, record.metal, record.weightGrams, record.diameterMm, record.portrait]
    .filter(Boolean).length + record.diagnosticMarkers.length + Math.min(2, record.images.length);
}

function typeId(key) {
  return `mnk-type:${createHash("sha256").update(key).digest("hex").slice(0, 16)}`;
}

function mergeTypes(records, previousIdsBySource = new Map()) {
  const groups = new Map();
  for (const record of records) {
    const key = canonicalTypeKey(record);
    const current = groups.get(key);
    if (!current) {
      groups.set(key, { ...record, id: previousIdsBySource.get(record.source.url) || typeId(key), specimenCount: 1, specimenSources: [record.source], images: [...record.images] });
      continue;
    }
    current.specimenCount += 1;
    current.specimenSources.push(record.source);
    current.images = [...new Set([...current.images, ...record.images])].slice(0, 8);
    current.diagnosticMarkers = [...new Set([...current.diagnosticMarkers, ...record.diagnosticMarkers])].slice(0, 10);
    if (qualityScore(record) > qualityScore(current)) {
      const preserved = {
        id: current.id,
        specimenCount: current.specimenCount,
        specimenSources: current.specimenSources,
        images: current.images,
        diagnosticMarkers: current.diagnosticMarkers,
      };
      Object.assign(current, record, preserved);
    }
    current.source.provenance = current.specimenSources.slice(0, 8).map((source) => ({
      name: source.name,
      recordId: source.recordId,
      url: source.url,
      rightsCode: source.rightsCode,
    }));
  }
  return [...groups.values()].sort((a, b) =>
    Number(a.year || 9999) - Number(b.year || 9999) ||
    a.ruler.localeCompare(b.ruler, "pl") ||
    a.nominal.localeCompare(b.nominal, "pl") ||
    a.title.localeCompare(b.title, "pl"),
  );
}

function coverage(records) {
  const byPeriod = {};
  const byRuler = {};
  const byNominal = {};
  let withImages = 0;
  for (const record of records) {
    byPeriod[record.period] = (byPeriod[record.period] || 0) + 1;
    if (record.ruler) byRuler[record.ruler] = (byRuler[record.ruler] || 0) + 1;
    if (record.nominal) byNominal[record.nominal] = (byNominal[record.nominal] || 0) + 1;
    if (record.images.length >= 2) withImages += 1;
  }
  return { byPeriod, byRuler, byNominal, withTwoSideImages: withImages };
}

async function main() {
  await mkdir(BUILD_DIR, { recursive: true });
  const discovery = await discover();
  const selected = shortlist(discovery.items);
  console.log(`[filter] monety: ${selected.filtered.length}; typy wstępne: ${selected.representatives.length}`);
  if (discoverOnly) return;
  const details = await collectDetails(selected.representatives);
  const transformed = details.map(transform).filter(Boolean);
  const previousCatalog = await readGzipJson(OUTPUT, { records: [] });
  const previousIdsBySource = new Map();
  for (const record of previousCatalog.records || []) {
    for (const source of [record.source, ...(record.specimenSources || [])]) {
      if (source?.url && !previousIdsBySource.has(source.url)) previousIdsBySource.set(source.url, record.id);
    }
  }
  const records = mergeTypes(transformed, previousIdsBySource);
  const output = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    policy: {
      purpose: "Polish coin identification candidates from the Middle Ages to modern times",
      source: "Muzeum Narodowe w Krakowie — Zbiory Cyfrowe",
      rightsGate: "Only item-level records explicitly marked Domena publiczna and unrestricted",
      transformations: "Independent APOMONET field normalization and diagnostic atoms; no copied catalogue prose",
      provenanceRequired: true,
    },
    stats: {
      discoveredObjects: discovery.items.length,
      filteredCoinObjects: selected.filtered.length,
      detailRecordsReviewed: details.length,
      acceptedPublicDomainSpecimens: transformed.length,
      canonicalTypes: records.length,
      ...coverage(records),
    },
    records,
  };
  await writeGzipJson(OUTPUT, output);
  console.log(`[done] ${records.length} typów zapisano w ${OUTPUT}`);
  console.log(JSON.stringify(output.stats, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
