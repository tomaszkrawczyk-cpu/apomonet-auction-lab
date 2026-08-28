#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SCRATCH = resolve(ROOT, "..");
const BUILD_CACHE = resolve(ROOT, "data/recognition/build/kpbc");
const OUTPUT = resolve(ROOT, "data/recognition/czapski-public-domain-catalog-v1.json.gz");
const RETRIEVED_AT = new Date().toISOString().slice(0, 10);
const KPBC_VOLUMES = {
  1: "https://kpbc.umk.pl/dlibra/publication/74966/edition/81665",
  2: "https://kpbc.umk.pl/dlibra/publication/74967/edition/81670",
  3: "https://kpbc.umk.pl/dlibra/publication/74968/edition/81683",
  4: "https://kpbc.umk.pl/dlibra/publication/74969/edition/81955",
  5: "https://kpbc.umk.pl/dlibra/publication/74970/edition/81956",
};

const NOMINALS = [
  [/\b(?:quadruple|4)\s+ducat/i, "Czworodukat"],
  [/\b(?:triple|3)\s+ducat/i, "Trzydukat"],
  [/\b(?:double|2)\s+ducat/i, "Dwudukat"],
  [/\bducat/i, "Dukat"],
  [/\b(?:double|2)\s+(?:thaler|taler)/i, "Dwutalar"],
  [/\b(?:demi|half|1\s*\/\s*2)\s+(?:thaler|taler)/i, "Półtalar"],
  [/\b(?:thaler|taler)\b/i, "Talar"],
  [/\b(?:six[- ]?gros|sextuple\s+gros|6\s+gros|sz[oó]stak)/i, "Szóstak"],
  [/\b(?:quadruple[- ]?gros|4\s+gros|czworak)/i, "Czworak"],
  [/\b(?:triple[- ]?gros|3\s+gros|trojak)/i, "Trojak"],
  [/\b(?:demi[- ]?gros|half[- ]?gros|p[oó][łl]grosz)/i, "Półgrosz"],
  [/\b18\s+gros|\bort\b/i, "Ort"],
  [/\b(?:pi[eè]ce\s+d['’]un\s+gros\s+et\s+demi|p[oô]ltorak|p[oó][łl]torak)/i, "Półtorak"],
  [/\b(?:ternarius|triple\s+denier|trzeciak)/i, "Trzeciak"],
  [/\b(?:quartensis|quartnik|kwartnik)/i, "Kwartnik"],
  // In French descriptions "gros cercle" and "gros denier" describe size,
  // not a grosz denomination. Keep the bare French form only outside those
  // two phrases.
  [/\b(?:grosz|groszy|groschen)\b/i, "Grosz"],
  [/\bGros\s+(?:de|polonais|lithuanien|couronne|Pologne)\b/, "Grosz"],
  [/\b(?:sou|solidus|schilling|szel[aą]g)\b/i, "Szeląg"],
  [/\b(?:denier|denar|denarius|pfennig)\b/i, "Denar"],
  [/\b(?:bract[ée]ate|brakteat)\b/i, "Brakteat"],
  [/\b(?:florin|gulden)\b/i, "Floren"],
  [/\b(?:rouble|rubel)\b/i, "Rubel"],
  [/\bkop(?:e|ie|iejk)/i, "Kopiejka"],
  [/\bmark(?:a|i)?\b/i, "Marka"],
];

const MINTS = [
  [/\b(?:Dantzig|Gedan(?:ensis)?|Gda[ńn]sk)\b/i, "Gdańsk"],
  [/\b(?:Elbing|Elbl[aą]g)\b/i, "Elbląg"],
  [/\b(?:Thorn|Thorun|Toru[ńn])\b/i, "Toruń"],
  [/\b(?:Cracovie|Cracovia|Krak[oó]w)\b/i, "Kraków"],
  [/\b(?:Vilna|Vilnius|Wilno)\b/i, "Wilno"],
  [/\b(?:Riga|Ryga)\b/i, "Ryga"],
  [/\b(?:Bromberg|Bydgoszcz)\b/i, "Bydgoszcz"],
  [/\b(?:Marienburg|Malbork)\b/i, "Malbork"],
  [/\bLublin\b/i, "Lublin"],
  [/\b(?:Posen|Pozna[ńn])\b/i, "Poznań"],
  [/\b(?:Fraustadt|Wschowa)\b/i, "Wschowa"],
  [/\b(?:K[oö]nigsberg|Kr[oó]lewiec)\b/i, "Królewiec"],
  [/\b(?:Warsovie|Warszawa|Warschau)\b/i, "Warszawa"],
];

const RULERS = [
  [/\bDuch[ée]\s+de\s+Varsovie\b/i, "Księstwo Warszawskie"],
  [/\bRoyaume\s+de\s+Pologne\b/i, "Królestwo Polskie"],
  [/\b(?:Ville libre|R[ée]publique)\s+de\s+Cracovie\b/i, "Wolne Miasto Kraków"],
  [/\bMiecislas\s+I\b|\bMieszko\s+I\b/i, "Mieszko I"],
  [/\bMiecislas\s+II\b|\bMieszko\s+II\b/i, "Mieszko II Lambert"],
  [/\bBoleslas\s+I\b|\bBoles[łl]aw\s+I\b/i, "Bolesław I Chrobry"],
  [/\bBoleslas\s+II\b|\bBoles[łl]aw\s+II\b/i, "Bolesław II Śmiały"],
  [/\bBoleslas\s+III\b|\bBoles[łl]aw\s+III\b/i, "Bolesław III Krzywousty"],
  [/\bBoleslas\s+IV\b|\bBoles[łl]aw\s+IV\b/i, "Bolesław IV Kędzierzawy"],
  [/\bCasimir\s+I\b|\bKazimierz\s+I\b/i, "Kazimierz I Odnowiciel"],
  [/\bCasimir\s+II\b|\bKazimierz\s+II\b/i, "Kazimierz II Sprawiedliwy"],
  [/\bCasimir\s+III\b|\bKazimierz\s+III\b/i, "Kazimierz III Wielki"],
  [/\bCasimir\s+IV\b|\bKazimierz\s+IV\b/i, "Kazimierz IV Jagiellończyk"],
  [/\bLadislas\s+I\b|\bVladislas\s+I\b|\bW[łl]adys[łl]aw\s+I\b/i, "Władysław I Łokietek"],
  [/\bLadislas\s+II\b|\bVladislas\s+II\b|\bW[łl]adys[łl]aw\s+II\b/i, "Władysław II Jagiełło"],
  [/\bLadislas\s+III\b|\bVladislas\s+III\b|\bW[łl]adys[łl]aw\s+III\b/i, "Władysław III Warneńczyk"],
  [/\bLadislas\s+IV\b|\bVladislas\s+IV\b|\bW[łl]adys[łl]aw\s+IV\b/i, "Władysław IV Waza"],
  [/\bSigismond\s+I\b|\bSigismund\s+I\b|\bZygmunt\s+I\b/i, "Zygmunt I Stary"],
  [/\bSigismond\s+II\b|\bSigismund\s+II\b|\bZygmunt\s+II\b/i, "Zygmunt II August"],
  [/\bSigismond\s+III\b|\bSigismund\s+III\b|\bZygmunt\s+III\b/i, "Zygmunt III Waza"],
  [/\bEtienne\s+Bator|\bStefan\s+Bator|\bStephen\s+B[aá]thor/i, "Stefan Batory"],
  [/\bJean\s+Casimir|\bJohn\s+Casimir|\bJan(?:\s+II)?\s+Kazimierz/i, "Jan II Kazimierz"],
  [/\bJean\s+III|\bJohn\s+III|\bJan\s+III|\bSobieski\b/i, "Jan III Sobieski"],
  [/\bMichel\s+Korybut|\bMicha[łl]\s+Korybut/i, "Michał Korybut Wiśniowiecki"],
  [/\bAuguste\s+II|\bAugust\s+II/i, "August II Mocny"],
  [/\bAuguste\s+III|\bAugust\s+III/i, "August III Sas"],
  [/\bStanislas\s+Auguste|\bStanis[łl]aw\s+August/i, "Stanisław August Poniatowski"],
  [/\bAlexandre\s+Jagellon|\bAleksander\s+Jagiello/i, "Aleksander Jagiellończyk"],
  [/\bJean\s+Albert|\bJan\s+Olbracht/i, "Jan I Olbracht"],
  [/\bLouis\s+(?:I|de Hongrie)|\bLudwik\s+W[ęe]gierski/i, "Ludwik Węgierski"],
  [/\bHedvige\b|\bJadwiga\b/i, "Jadwiga Andegaweńska"],
  [/\bHenri\s+de Valois|\bHenryk\s+Walezy/i, "Henryk Walezy"],
  [/\bWenceslas\s+II\b|\bWac[łl]aw\s+II\b/i, "Wacław II"],
  [/\bPrzemyslas\s+II\b|\bPrzemys[łl]\s+II\b/i, "Przemysł II"],
  [/\bLeszek\s+(?:le Blanc|Bia[łl]y)/i, "Leszek Biały"],
];

const RULER_YEAR_RANGES = new Map([
  ["Mieszko I", [960, 992]],
  ["Mieszko II Lambert", [1025, 1034]],
  ["Bolesław I Chrobry", [992, 1025]],
  ["Bolesław II Śmiały", [1058, 1080]],
  ["Bolesław III Krzywousty", [1102, 1138]],
  ["Bolesław IV Kędzierzawy", [1146, 1173]],
  ["Kazimierz I Odnowiciel", [1034, 1058]],
  ["Kazimierz II Sprawiedliwy", [1177, 1194]],
  ["Kazimierz III Wielki", [1333, 1370]],
  ["Kazimierz IV Jagiellończyk", [1447, 1492]],
  ["Władysław I Łokietek", [1306, 1333]],
  ["Władysław II Jagiełło", [1386, 1434]],
  ["Władysław III Warneńczyk", [1434, 1444]],
  ["Władysław IV Waza", [1632, 1648]],
  ["Zygmunt I Stary", [1506, 1548]],
  ["Zygmunt II August", [1548, 1572]],
  ["Zygmunt III Waza", [1587, 1632]],
  ["Stefan Batory", [1576, 1586]],
  ["Jan II Kazimierz", [1648, 1668]],
  ["Jan III Sobieski", [1674, 1696]],
  ["Michał Korybut Wiśniowiecki", [1669, 1673]],
  ["August II Mocny", [1697, 1733]],
  ["August III Sas", [1733, 1763]],
  ["Stanisław August Poniatowski", [1764, 1795]],
  ["Aleksander Jagiellończyk", [1501, 1506]],
  ["Jan I Olbracht", [1492, 1501]],
  ["Ludwik Węgierski", [1370, 1382]],
  ["Jadwiga Andegaweńska", [1384, 1399]],
  ["Henryk Walezy", [1573, 1575]],
  ["Wacław II", [1300, 1305]],
  ["Przemysł II", [1295, 1296]],
  ["Leszek Biały", [1194, 1227]],
  ["Władysław I Herman", [1079, 1102]],
  ["Władysław II Wygnaniec", [1138, 1146]],
  ["Księstwo Warszawskie", [1807, 1815]],
  ["Królestwo Polskie", [1815, 1841]],
  ["Wolne Miasto Kraków", [1815, 1846]],
]);

function clean(value) {
  return String(value ?? "")
    .replace(/\u00ad/g, "")
    // Column OCR occasionally inserts a space inside a 4/5-digit catalogue
    // number immediately before its cross-reference (e.g. `100 25/6794a`).
    .replace(/(^|\n)(\s*[^0-9\n]{0,4})(\d{1,3})\s+(\d{2,3})(?=\/)/g, "$1$2$3$4")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .trim();
}

function roman(value) {
  const table = { I: 1, II: 2, III: 3, IV: 4, V: 5 };
  return table[String(value).toUpperCase()] || 0;
}

function recordContextScore(text) {
  const excerpt = text.slice(0, 1_200);
  const nominal = NOMINALS.some(([pattern]) => pattern.test(excerpt));
  const sides = /(?:^|\n)\s*A\./m.test(excerpt) || /(?:^|\n)\s*R\./m.test(excerpt);
  const crossReference = /pareil(?:e|s)?\s+au\s+No\./i.test(excerpt);
  return Number(nominal) * 3 + Number(sides) * 2 + Number(crossReference);
}

function markerCandidates(pages) {
  const candidates = [];
  let offset = 0;
  let corpus = "";
  for (const page of pages) {
    const prefix = `\n\n[[PAGE:${page.page}]]\n`;
    corpus += prefix;
    offset += prefix.length;
    const text = clean(page.text);
    // Column OCR sometimes leaves a short table/ornament prefix before the
    // catalogue number and often keeps the description on the same line.
    // Requiring a line start prevents cross-references such as "No. 321"
    // from becoming records, while the monotonic selector below rejects years.
    for (const match of text.matchAll(/(?:^|\n)\s*[^0-9\n]{0,4}(?:(\d{1,5})\.(?:\/\S{1,20})?|(\d{4,5})(?:\/\S{1,20})?)\s+/g)) {
      const rawNumber = match[1] || match[2];
      const number = Number(rawNumber);
      const position = offset + match.index + match[0].lastIndexOf(rawNumber);
      candidates.push({ number, position, page: page.page, score: recordContextScore(text.slice(match.index + match[0].length)) });
    }
    corpus += text;
    offset += text.length;
  }
  return { candidates, corpus };
}

function selectRecordMarkers(candidates, volume) {
  const selected = [];
  let current = 0;
  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = candidates[index];
    if (!current) {
      const plausibleStart = volume === 1
        ? candidate.number <= 50
        : candidate.number > 2026;
      if (plausibleStart && candidate.score >= 2) {
        selected.push(candidate);
        current = candidate.number;
      }
      continue;
    }
    const gap = candidate.number - current;
    if (gap <= 0 || gap > 12) continue;
    if (gap > 3 && candidate.score < 2) continue;
    const competing = candidates.slice(index + 1, index + 5).find((item) => item.number > current && item.number < candidate.number);
    if (competing && competing.score >= candidate.score) continue;
    selected.push(candidate);
    current = candidate.number;
  }
  return selected;
}

function nearestRulerHeading(corpus, position) {
  const start = Math.max(0, position - 30_000);
  const before = corpus.slice(start, position);
  let winner = { value: "", index: -1, reignStart: null, reignEnd: null };
  for (const [pattern, value] of RULERS) {
    const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`;
    const globalPattern = new RegExp(pattern.source, flags);
    for (const match of before.matchAll(globalPattern)) {
      // A ruler's name in a biography or cross-reference is not a section
      // heading. Czapski headings are followed by the reign range.
      const tail = before.slice(match.index + match[0].length, match.index + match[0].length + 180);
      const range = tail.match(/(?:^|[,\.\s])((?:9\d{2}|1\d{3}))\s*[—–-]\s*((?:9\d{2}|1\d{3}))/);
      if (range && match.index > winner.index) {
        const reignStart = Number(range[1]);
        const reignEnd = Number(range[2]);
        let normalizedValue = value;
        if (value === "Władysław I Łokietek" && reignEnd < 1200) normalizedValue = "Władysław I Herman";
        if (value === "Władysław II Jagiełło" && reignEnd < 1200) normalizedValue = "Władysław II Wygnaniec";
        winner = {
          value: normalizedValue,
          index: match.index,
          reignStart,
          reignEnd,
        };
      }
    }
  }
  return winner;
}

function nearestYear(corpus, position, recordPositions) {
  const start = Math.max(0, position - 16_000);
  const before = corpus.slice(start, position);
  let result = "";
  for (const match of before.matchAll(/(?:^|\n)\s*((?:9\d{2}|1\d{3}|20(?:0\d|1\d|2[0-6])))\.\s*(?=\n|$)/g)) {
    const absolute = start + match.index + match[0].lastIndexOf(match[1]);
    if (!recordPositions.has(absolute)) result = match[1];
  }
  return result;
}

function matchValue(text, mappings) {
  return mappings.find(([pattern]) => pattern.test(text))?.[1] || "";
}

function validatedYear(candidate, ruler, heading) {
  if (!candidate) return "";
  const year = Number(candidate);
  const canonicalRange = RULER_YEAR_RANGES.get(ruler);
  const range = canonicalRange || (
    heading?.reignStart && heading?.reignEnd
      ? [heading.reignStart, heading.reignEnd]
      : null
  );
  if (range && (year < range[0] || year > range[1])) return "";
  return String(year);
}

function yearFromBlock(block, ruler, heading, markerNumber) {
  // Exact dates must occur very close to the record marker. Later dates in a
  // block usually belong to the next ruler biography, bibliography or table
  // column after OCR reordered the page.
  const excerpt = block.slice(0, 360);
  const candidates = [];
  for (const match of excerpt.matchAll(/\b((?:9\d{2}|1\d{3}|20(?:0\d|1\d|2[0-6])))\b/g)) {
    const year = Number(match[1]);
    // Before 1500 the OCR most often sees dates from ruler biographies,
    // bibliographies and reign headings rather than an exact issue date.
    // Stage 1 is better served by an empty year than a confident false year.
    if (year < 1500) continue;
    if (year === markerNumber) continue;
    const before = excerpt.slice(Math.max(0, match.index - 12), match.index);
    if (/No\.?\s*$/i.test(before)) continue;
    candidates.push(String(year));
  }
  const withinChronology = candidates.find((candidate) => validatedYear(candidate, ruler, heading));
  return withinChronology || "";
}

function nominalFromBlock(block) {
  const matches = [];
  for (const [pattern, nominal] of NOMINALS) {
    const match = pattern.exec(block);
    if (match) matches.push({ nominal, index: match.index });
  }
  return matches.sort((left, right) => left.index - right.index)[0]?.nominal || "";
}

function extractLegend(block, side) {
  const other = side === "A" ? "R" : "(?:A|B)";
  const match = block.match(new RegExp(`(?:^|\\n)\\s*${side}\\.\\s*([\\s\\S]*?)(?=\\n\\s*${other}\\.|$)`, "im"));
  if (!match) return "";
  const firstPart = match[1]
    .split(/\b(?:Dans un|Buste|Écusson|Tête|Croix|Cavalier|Armes|Au milieu|Monogramme|Figure)\b/i)[0]
    .replace(/\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const letters = firstPart.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ]/g, "");
  const asciiWords = firstPart.match(/[A-Z]{2,}/g) || [];
  const mojibake = firstPart.match(/[àâäæçèéêëìîïòôöùûüÿ]/gi) || [];
  // Broken OCR glyph soup is worse than an empty legend for retrieval.
  return letters.length >= 3 && asciiWords.length >= 2 && mojibake.length <= Math.max(2, letters.length * 0.12)
    ? firstPart.slice(0, 220)
    : "";
}

function isExcluded(block) {
  const lower = block.toLowerCase();
  if (/\b(?:m[ée]daille|jeton|amulette|sceau|plaque)\b/.test(lower)) return true;
  if (/\b(?:faux|fausse|faussaire|falsification|contrefa[cç]on|copie moderne)\b/.test(lower)) return true;
  return false;
}

function makeRecord({ block, corpus, marker, nextMarker, volume, sourceUrl, recordPositions, factsByNumber, previousRecord }) {
  if (isExcluded(block)) return { record: null, reason: "excluded-object" };
  const crossReferenceNumber = Number(block.match(/\bNo\.\s*(\d{1,5})\b/i)?.[1]) || 0;
  const referenced = factsByNumber.get(crossReferenceNumber);
  const inheritsPrevious = /\b(?:id\.|pareil(?:e|s)?\b)/i.test(block);
  const inherited = referenced || (inheritsPrevious ? previousRecord : null);
  const explicitNominal = nominalFromBlock(block);
  const nominal = explicitNominal || inherited?.nominal || "";
  if (!nominal) return { record: null, reason: "missing-nominal" };
  const heading = nearestRulerHeading(corpus, marker.position);
  const ruler = heading.value || inherited?.ruler || "";
  const year = yearFromBlock(block, ruler, heading, marker.number)
    || validatedYear(referenced?.year || "", ruler, heading)
    || "";
  const mint = matchValue(block, MINTS) || referenced?.mint || "";
  // Generic OCR keyword matching produced false positives when "essai"
  // occurred in commentary. Historical trials are added only through an
  // explicit, record-level verification list; no such override is enabled
  // until the record has been checked against the scan.
  const isPattern = false;
  const catalogReference = `H-Cz ${volume} ${marker.number}`;
  const sourceRecordUrl = `${sourceUrl}#page=${marker.page}`;
  const id = createHash("sha1").update(`${volume}:${marker.number}`).digest("hex").slice(0, 20);
  const record = {
    id: `czapski:${id}`,
    title: [nominal, ruler, year, mint, isPattern ? "próba" : ""].filter(Boolean).join(", "),
    objectKind: isPattern ? "pattern-coin" : "coin",
    country: "Polska / ziemie historycznie polskie",
    ruler,
    year,
    nominal,
    metal: "",
    mint,
    shape: "round",
    weightGrams: null,
    diameterMm: null,
    portrait: "",
    obverseLegend: extractLegend(block, "A"),
    reverseLegend: extractLegend(block, "R"),
    diagnosticMarkers: [
      `katalog:${catalogReference}`,
      ruler ? `władca:${ruler}` : "",
      mint ? `mennica:${mint}` : "",
      year ? `rok:${year}` : "",
      crossReferenceNumber ? `odsyłacz-katalogowy:No.${crossReferenceNumber}` : "",
    ].filter(Boolean),
    images: [],
    source: {
      type: "public-domain-historical-catalog",
      name: "Emeric Hutten-Czapski — Catalogue de la collection des médailles et monnaies polonaises",
      recordId: `${catalogReference}; strona skanu ${marker.page}`,
      url: sourceRecordUrl,
      rights: "Domena publiczna. APOMONET zachowuje identyfikator i ustrukturyzowane fakty; nie publikuje opisu katalogowego ani skanu.",
      rightsCode: "public-domain",
      restricted: false,
      retrievedAt: RETRIEVED_AT,
      extractionConfidence: "ocr-structured-candidate",
    },
  };
  const strongIdentitySignals = Number(Boolean(ruler))
    + Number(Boolean(year))
    + Number(Boolean(mint))
    + Number(Boolean(record.obverseLegend || record.reverseLegend));
  if (!explicitNominal && !referenced) return { record: null, reason: "weak-inherited-nominal" };
  if (strongIdentitySignals < 1) return { record: null, reason: "insufficient-identity-signals" };
  return { record, reason: "accepted", nextPosition: nextMarker?.position || corpus.length };
}

function parseVolume(payload, inputPath, factsByNumber) {
  const volume = Number(payload.volume) || roman(inputPath.match(/vol(?:ume)?[-_ ]?([iv\d]+)/i)?.[1] || 1) || 1;
  const pages = Object.entries(payload.pages || {})
    .map(([page, text]) => ({ page: Number(page), text: clean(text) }))
    .filter((item) => item.page > 0 && item.text)
    .sort((left, right) => left.page - right.page);
  const { candidates, corpus } = markerCandidates(pages);
  const markers = selectRecordMarkers(candidates, volume);
  const positions = new Set(markers.map((marker) => marker.position));
  const sourceUrl = payload.sourceUrl || KPBC_VOLUMES[volume] || "https://kpbc.umk.pl/dlibra/publication/74966";
  const records = [];
  const rejected = {};
  let previousRecord = null;
  for (let index = 0; index < markers.length; index += 1) {
    const marker = markers[index];
    const nextMarker = markers[index + 1];
    const block = corpus.slice(marker.position, nextMarker?.position || corpus.length);
    const parsed = makeRecord({
      block, corpus, marker, nextMarker, volume, sourceUrl, recordPositions: positions,
      factsByNumber, previousRecord,
    });
    if (parsed.record) {
      records.push(parsed.record);
      factsByNumber.set(marker.number, parsed.record);
      previousRecord = parsed.record;
    }
    else rejected[parsed.reason] = (rejected[parsed.reason] || 0) + 1;
  }
  return {
    volume,
    sourceUrl,
    pages: pages.length,
    numericCandidates: candidates.length,
    selectedMarkers: markers.length,
    firstMarker: markers[0]?.number || null,
    lastMarker: markers.at(-1)?.number || null,
    rejected,
    records,
  };
}

async function inputFiles() {
  if (process.env.CZAPSKI_OCR_FILES) {
    return process.env.CZAPSKI_OCR_FILES.split(/[,:]/).map((item) => resolve(item.trim())).filter(Boolean);
  }
  const roots = [BUILD_CACHE, SCRATCH, resolve(SCRATCH, "..")];
  const found = [];
  for (const root of roots) {
    try {
      const names = await readdir(root);
      found.push(...names
        .filter((name) => /^czapski-vol[iv\d]+-ocr\.json$/i.test(name))
        .map((name) => resolve(root, name)));
    } catch {
      // A cache/input root is optional.
    }
  }
  return [...new Set(found)].sort();
}

async function main() {
  const inputs = await inputFiles();
  if (!inputs.length) throw new Error(`Nie znaleziono czapski-vol*-ocr.json w ${SCRATCH}`);
  const selectedInputs = new Map();
  for (const input of inputs) {
    const payload = JSON.parse(await readFile(input, "utf8"));
    const volume = Number(payload.volume) || roman(input.match(/vol(?:ume)?[-_ ]?([iv\d]+)/i)?.[1] || 1) || 1;
    if (!selectedInputs.has(volume)) selectedInputs.set(volume, { input, payload, volume });
  }
  const volumes = [];
  const factsByNumber = new Map();
  for (const { input, payload } of [...selectedInputs.values()].sort((left, right) => left.volume - right.volume)) {
    const parsed = parseVolume(payload, input, factsByNumber);
    volumes.push(parsed);
    console.log(`[Czapski] tom ${parsed.volume}: markery=${parsed.selectedMarkers}, monety=${parsed.records.length}, zakres=${parsed.firstMarker}-${parsed.lastMarker}`);
  }
  const records = [...new Map(volumes.flatMap((volume) => volume.records).map((record) => [record.id, record])).values()];
  const stats = {
    inputVolumes: volumes.length,
    scannedPages: volumes.reduce((sum, volume) => sum + volume.pages, 0),
    selectedCatalogEntries: volumes.reduce((sum, volume) => sum + volume.selectedMarkers, 0),
    acceptedCoinRecords: records.length,
    patternRecords: records.filter((record) => record.objectKind === "pattern-coin").length,
    withRuler: records.filter((record) => record.ruler).length,
    withYear: records.filter((record) => record.year).length,
    withMint: records.filter((record) => record.mint).length,
    withLegends: records.filter((record) => record.obverseLegend || record.reverseLegend).length,
    volumes: volumes.map(({ records: ignored, ...volume }) => volume),
  };
  const catalog = {
    version: "czapski-public-domain-v1",
    generatedAt: new Date().toISOString(),
    scope: "Podstawowa identyfikacja polskich monet z public-domain katalogu Czapskiego; bez medali, żetonów i falsyfikatów.",
    policy: {
      stage: "stage1-basic-identity",
      descriptionsCopied: false,
      imagesCopied: false,
      sourceFactsOnly: true,
      variantsDeferred: true,
    },
    stats,
    records,
  };
  await mkdir(dirname(OUTPUT), { recursive: true });
  await writeFile(OUTPUT, gzipSync(`${JSON.stringify(catalog)}\n`, { level: 9 }));
  console.log(JSON.stringify(stats, null, 2));
  console.log(`[Czapski] zapisano ${OUTPUT}`);
}

await main();
