#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { localReferenceCandidates } from "../lib/recognition-core.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT = resolve(ROOT, "data/recognition/recognition-hierarchy-v1.json.gz");
const RUNTIME_OUTPUT = resolve(ROOT, "data/recognition/recognition-hierarchy-runtime-v1.json.gz");
const AS_OF = "2026-08-30";

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

function stableId(prefix, key) {
  return `${prefix}_${createHash("sha256").update(key).digest("hex").slice(0, 16)}`;
}

const RULER_ALIASES = [
  [/\bboleslaw (?:i )?chrobry\b/, "Bolesław I Chrobry"],
  [/\bjan (?:ii )?kazimierz(?: waza)?\b|\bjohann casimir\b|\bioannes casimirus\b/, "Jan II Kazimierz"],
  [/\bzygmunt iii(?: waza)?\b|\bsigismund iii(?: vasa)?\b/, "Zygmunt III Waza"],
  [/\bwladyslaw iv(?: waza)?\b|\bvladislaus iv(?: vasa)?\b/, "Władysław IV Waza"],
  [/\bzygmunt ii(?: august)?\b|\bzygmunt august\b|\bsigismund ii(?: augustus)?\b/, "Zygmunt II August"],
  [/\bzygmunt i(?: stary)?\b|\bzygmunt stary\b|\bsigismund i(?: the old)?\b/, "Zygmunt I Stary"],
  [/\bstefan batory\b|\bstephan bathory\b/, "Stefan Batory"],
  [/\bstanislaw august(?: poniatowski)?\b/, "Stanisław August Poniatowski"],
  [/\bwladyslaw jagiello\b|\bvladislaus ii jagiello\b/, "Władysław Jagiełło"],
  [/\bkazimierz jagiellonczyk\b|\bcasimir iv jagiellon\b/, "Kazimierz IV Jagiellończyk"],
];

const MINT_ALIASES = [
  [/\b(?:mennica panstwowa|warsaw|varsav\w*|warszawa)\b/, "Warszawa"],
  [/\b(?:danzig|gedan\w*|gdansk)\b/, "Gdańsk"],
  [/\b(?:thorn|torun)\b/, "Toruń"],
  [/\b(?:bromberg|bydgoszcz)\b/, "Bydgoszcz"],
  [/\b(?:cracow|krakau|krakow)\b/, "Kraków"],
  [/\b(?:viln\w*|wilno)\b/, "Wilno"],
  [/\b(?:elbing|elblag)\b/, "Elbląg"],
  [/\b(?:riga|ryga)\b/, "Ryga"],
  [/\b(?:posen|poznan)\b/, "Poznań"],
  [/\b(?:fraustadt|wschowa)\b/, "Wschowa"],
  [/\b(?:marienburg|malbork)\b/, "Malbork"],
  [/\b(?:leipzig|lipsk)\b/, "Lipsk"],
];

const NOMINAL_ALIASES = [
  [/\b(?:1\/2|½)\s*(?:grosz\w*|gr)\b|\bpolgrosz\w*\b/, "Półgrosz"],
  [/\b(?:3\s*grosz\w*|3\s*gr|trojak\w*)\b/, "Trojak"],
  [/\b(?:4\s*grosz\w*|4\s*gr|czworak\w*)\b/, "Czworak"],
  [/\b(?:6\s*grosz\w*|6\s*gr|szostak\w*)\b/, "Szóstak"],
  [/\b(?:18\s*grosz\w*|ort\w*)\b/, "Ort"],
  [/\b(?:schilling|solidus|szelag\w*)\b/, "Szeląg"],
  [/\b(?:thaler|taler\w*)\b/, "Talar"],
  [/\b(?:ducat|dukat)\b/, "Dukat"],
  [/\b(?:kopeck|kopek|kopiejk\w*)\b/, "Kopiejka"],
  [/\b(?:pfennig|fenig\w*)\b/, "Fenig"],
  [/\b(?:mark|marka|marki)\b/, "Marka"],
  [/\bdenar\w*\b/, "Denar"],
  [/\bbrakteat\w*\b/, "Brakteat"],
  [/\bgrosz\w*\b|\bgr\b/, "Grosz"],
  [/\bzlot\w*\b|\bzl\b/, "Złoty"],
];

const PERIODS = [
  { id: "medieval", label: "Średniowiecze do 1385", order: 10 },
  { id: "jagiellonian", label: "Jagiellonowie 1386–1572", order: 20 },
  { id: "elective-monarchy", label: "Monarchia elekcyjna 1573–1795", order: 30 },
  { id: "partitions-and-uprisings", label: "Zabory i powstania 1796–1918", order: 40 },
  { id: "second-republic-and-war", label: "II RP i emisje wojenne 1918–1945", order: 50 },
  { id: "people-republic", label: "PRL 1946–1989", order: 60 },
  { id: "third-republic", label: "III RP od 1990", order: 70 },
  { id: "undated", label: "Niedatowane lub wymagające przypisania", order: 99 },
];

function firstYear(value) {
  const year = clean(value).match(/\b(9\d{2}|1\d{3}|20\d{2})\b/)?.[1];
  return year ? Number(year) : null;
}

function periodId(record) {
  const explicit = clean(record.period);
  if (PERIODS.some((period) => period.id === explicit)) return explicit;
  if (explicit === "medieval-piast") return "medieval";
  const year = firstYear(record.year);
  if (!year) return "undated";
  if (year <= 1385) return "medieval";
  if (year <= 1572) return "jagiellonian";
  if (year <= 1795) return "elective-monarchy";
  if (year <= 1917) return "partitions-and-uprisings";
  if (year <= 1945) return "second-republic-and-war";
  if (year <= 1989) return "people-republic";
  return "third-republic";
}

function canonicalAlias(value, aliases) {
  const source = normalized(value).replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
  return aliases.find(([pattern]) => pattern.test(source))?.[1] || clean(value).replace(/\s*\([^)]*\)\s*/g, " ").trim();
}

function canonicalAuthority(record) {
  const ruler = canonicalAlias(record.ruler, RULER_ALIASES);
  if (ruler && !/^(?:nieznany|nieokreslony|nie ustalono)$/i.test(ruler)) return ruler;
  const context = clean(record.circulationContext || record.country);
  return context || "Emitent nieustalony";
}

function canonicalMint(record) {
  const mint = canonicalAlias(record.mint, MINT_ALIASES);
  return mint || "Mennica nieustalona";
}

function canonicalNominal(record) {
  const nominal = normalized(record.nominal);
  const multiplier = nominal.match(/\b(2|3|4|5|6|8|10|20|30|50|100)\s*(?:dukat|ducat)/)?.[1];
  if (multiplier) return `${multiplier} dukatów`;
  if (/\b(?:polportugal|half portugal)\b/.test(nominal)) return "Półportugał";
  if (/\bportugal\b/.test(nominal)) return "Portugał";
  const alias = NOMINAL_ALIASES.find(([pattern]) => pattern.test(nominal))?.[1];
  if (!alias) return clean(record.nominal) || "Nominał nieustalony";
  const numeric = nominal.match(/(?:^|\s)(\d+|½)(?=\s|$)/)?.[1];
  if (!numeric || ["Dukat", "Talar", "Denar", "Brakteat", "Trojak", "Czworak", "Szóstak", "Ort", "Szeląg", "Półgrosz"].includes(alias)) return alias;
  return `${numeric} ${alias.toLowerCase()}`;
}

function canonicalClass(record) {
  const value = normalized(`${record.coinClass || ""} ${record.objectKind || ""} ${record.patternSeries || ""} ${record.source?.type || ""}`);
  if (/\b(?:proba|pattern|essai)\b/.test(value)) return "próbna";
  if (/\b(?:bullion|inwestycyjn)\b/.test(value)) return "inwestycyjna";
  if (/\b(?:collector|kolekcjonersk)\b/.test(value)) return "kolekcjonerska";
  if (/\b(?:commemorative|okolicznosciow)\b/.test(value)) return "okolicznościowa";
  if (record.source?.type === "official-legal-act") return "oficjalna emisja kolekcjonerska lub okolicznościowa";
  return "obiegowa lub historyczna";
}

function majorDesignSubject(record) {
  const nominal = normalized(record.nominal);
  const metal = normalized(record.metal);
  const technical = /^(?:projekt|projektant|seria|naklad|wymiary|masa|rant)\b|\b(?:stempel lustrzany|selektywne zlocenie|napis proba|wypukly napis proba|wklesly napis proba)\b/;
  const markers = (record.diagnosticMarkers || [])
    .map(clean)
    .filter(Boolean)
    .filter((marker) => {
      const value = normalized(marker);
      if (!value || value === nominal || value === metal) return false;
      if (technical.test(value)) return false;
      if (/^(?:au|ag|cu|ni|al|zn|sn|fe)\s*\d*/.test(value)) return false;
      return !/^\d+(?:[.,]\d+)?\s*(?:g|mm|zl|gr)$/.test(value);
    });
  const fromMarker = markers[0];
  const fromTitle = clean(record.title).includes("—")
    ? clean(record.title).split("—").at(-1)
    : clean(record.title).split(",")[0];
  return normalized(fromMarker || fromTitle)
    .replace(/\((?:z|bez) napisem proba\)/g, " ")
    .replace(/\b(?:z|bez) napisu proba\b/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

function familyDiscriminator(record, period, coinClass) {
  const pattern = clean(record.patternSeries);
  if (coinClass !== "obiegowa lub historyczna") {
    const subject = majorDesignSubject(record);
    if (subject) return `motyw ${subject}`;
    if (pattern) return `seria ${normalized(pattern)}`;
  }
  const context = normalized(`${record.circulationContext || ""} ${record.title || ""} ${record.mint || ""}`);
  const regional = [
    ["koron", "koronna"], ["litew", "litewska"], ["gdansk", "gdańska"], ["torun", "toruńska"],
    ["elblag", "elbląska"], ["ryg", "ryska"], ["rys", "ryska"], ["prus", "pruska"], ["slask", "śląska"],
    ["ksiestwo warszaw", "Księstwo Warszawskie"], ["krolestwo polsk", "Królestwo Polskie"],
    ["wolne miasto krak", "Wolne Miasto Kraków"], ["wolne miasto gdansk", "Wolne Miasto Gdańsk"],
  ].find(([token]) => context.includes(token))?.[1];
  if (regional) return regional;
  if (coinClass !== "obiegowa lub historyczna") {
    const core = normalized(record.title)
      .replace(/\b(?:9\d{2}|1\d{3}|20\d{2})\b/g, " ")
      .replace(/\b(?:moneta|polska|rzeczpospolita|narodowy bank polski|nbp)\b/g, " ")
      .replace(normalized(record.nominal), " ")
      .replace(/\s+/g, " ")
      .trim();
    if (core) return core.slice(0, 120);
  }
  if (period === "medieval") {
    const portrait = normalized(record.portrait);
    const markers = (record.diagnosticMarkers || []).map(normalized).filter(Boolean).sort().slice(0, 4).join(" ");
    const signature = clean(`${portrait} ${markers}`);
    if (signature) return signature.slice(0, 120);
  }
  return "typ podstawowy";
}

function sourceRightsCode(record) {
  return clean(record.source?.rightsCode);
}

function increment(map, key, factory) {
  if (!map.has(key)) map.set(key, factory());
  return map.get(key);
}

const records = localReferenceCandidates();
const periods = PERIODS.map((period) => ({ ...period, recordCount: 0, coinTypeCount: 0 }));
const periodById = new Map(periods.map((period) => [period.id, period]));
const authorities = new Map();
const denominations = new Map();
const coinTypes = new Map();
const issues = new Map();
const varieties = new Map();
const specimens = [];
const recordMap = {};

for (const record of records) {
  const period = periodId(record);
  const authority = canonicalAuthority(record);
  const nominal = canonicalNominal(record);
  const mint = canonicalMint(record);
  const coinClass = canonicalClass(record);
  const discriminator = familyDiscriminator(record, period, coinClass);
  const authorityId = stableId("authority", normalized(authority));
  const denominationId = stableId("denomination", normalized(nominal));
  const coinTypeKey = [period, normalized(authority), normalized(nominal), normalized(coinClass), normalized(discriminator)].join("|");
  const coinTypeId = stableId("type", coinTypeKey);
  const issueKey = [coinTypeKey, clean(record.year), normalized(mint), normalized(record.objectKind || "coin")].join("|");
  const issueId = stableId("issue", issueKey);
  const varietyKey = [
    issueKey,
    normalized(record.metal),
    normalized(record.variant),
    normalized(record.patternSeries),
    normalized(record.strike),
  ].join("|");
  const varietyId = stableId("variety", varietyKey);
  const specimenId = stableId("specimen", clean(record.id));
  const sourceName = clean(record.sourceName || record.source?.name);

  periodById.get(period).recordCount += 1;
  increment(authorities, authorityId, () => ({ id: authorityId, label: authority, aliases: new Set(), recordCount: 0, coinTypeIds: new Set() }));
  const authorityNode = authorities.get(authorityId);
  authorityNode.aliases.add(clean(record.ruler || authority));
  authorityNode.recordCount += 1;
  authorityNode.coinTypeIds.add(coinTypeId);

  increment(denominations, denominationId, () => ({ id: denominationId, label: nominal, aliases: new Set(), recordCount: 0, coinTypeIds: new Set() }));
  const denominationNode = denominations.get(denominationId);
  denominationNode.aliases.add(clean(record.nominal || nominal));
  denominationNode.recordCount += 1;
  denominationNode.coinTypeIds.add(coinTypeId);

  increment(coinTypes, coinTypeId, () => ({
    id: coinTypeId,
    periodId: period,
    authorityId,
    denominationId,
    label: `${authority} — ${nominal}${discriminator === "typ podstawowy" ? "" : ` — ${discriminator}`}`,
    coinClass,
    discriminator,
    issueIds: new Set(),
    sourceNames: new Set(),
    recordCount: 0,
    reviewFlags: new Set(),
  }));
  const typeNode = coinTypes.get(coinTypeId);
  typeNode.issueIds.add(issueId);
  typeNode.sourceNames.add(sourceName);
  typeNode.recordCount += 1;
  if (period === "medieval" && discriminator === "typ podstawowy") typeNode.reviewFlags.add("medieval-type-discriminator-missing");
  if (authority === "Emitent nieustalony") typeNode.reviewFlags.add("authority-unresolved");
  if (!clean(record.ruler) && /^polska(?:\b|\s*\/)/i.test(authority)) typeNode.reviewFlags.add("authority-generic");
  if (nominal === "Nominał nieustalony") typeNode.reviewFlags.add("denomination-unresolved");

  increment(issues, issueId, () => ({
    id: issueId,
    coinTypeId,
    year: clean(record.year),
    mint,
    objectKind: clean(record.objectKind || "coin"),
    varietyIds: new Set(),
    sourceNames: new Set(),
    recordCount: 0,
  }));
  const issueNode = issues.get(issueId);
  issueNode.varietyIds.add(varietyId);
  issueNode.sourceNames.add(sourceName);
  issueNode.recordCount += 1;

  increment(varieties, varietyId, () => ({
    id: varietyId,
    issueId,
    coinTypeId,
    metal: clean(record.metal),
    variant: clean(record.variant),
    patternSeries: clean(record.patternSeries),
    strike: clean(record.strike),
    specimenIds: [],
    sourceNames: new Set(),
    recordCount: 0,
  }));
  const varietyNode = varieties.get(varietyId);
  varietyNode.specimenIds.push(specimenId);
  varietyNode.sourceNames.add(sourceName);
  varietyNode.recordCount += 1;

  specimens.push({
    id: specimenId,
    varietyId,
    issueId,
    coinTypeId,
    recordId: clean(record.id),
    sourceName,
    sourceReference: clean(record.sourceReference || record.source?.recordId),
    sourceUrl: clean(record.sourceUrl || record.source?.url),
    rightsCode: sourceRightsCode(record),
    imageCount: Array.isArray(record.images) ? record.images.length : 0,
  });
  recordMap[clean(record.id)] = { coinTypeId, issueId, varietyId, specimenId, periodId: period, authorityId, denominationId };
}

for (const type of coinTypes.values()) periodById.get(type.periodId).coinTypeCount += 1;

const serializeSet = (value) => [...value].filter(Boolean).sort();
const result = {
  schemaVersion: 2,
  generatedAt: AS_OF,
  policy: {
    levels: ["period", "authority", "denomination", "coinType", "issue", "variety", "specimen"],
    coinType: "period + canonical authority + canonical denomination + class + major design/family discriminator",
    issue: "coin type + year/range + mint + object kind",
    variety: "issue + metal + explicit variant/pattern/strike; punctuation and die microdifferences remain fingerprints until independently verified",
    specimen: "one legal source record with its own provenance and rights",
    mergeSafety: "conservative deterministic grouping; flagged medieval or unresolved nodes require manual review and are never treated as expert verification",
  },
  aliases: {
    rulerRules: RULER_ALIASES.map(([pattern, canonical]) => ({ pattern: pattern.source, canonical })),
    mintRules: MINT_ALIASES.map(([pattern, canonical]) => ({ pattern: pattern.source, canonical })),
    nominalRules: NOMINAL_ALIASES.map(([pattern, canonical]) => ({ pattern: pattern.source, canonical })),
  },
  periods,
  authorities: [...authorities.values()].map((node) => ({ ...node, aliases: serializeSet(node.aliases), coinTypeIds: serializeSet(node.coinTypeIds) })),
  denominations: [...denominations.values()].map((node) => ({ ...node, aliases: serializeSet(node.aliases), coinTypeIds: serializeSet(node.coinTypeIds) })),
  coinTypes: [...coinTypes.values()].map((node) => ({ ...node, issueIds: serializeSet(node.issueIds), sourceNames: serializeSet(node.sourceNames), reviewFlags: serializeSet(node.reviewFlags) })),
  issues: [...issues.values()].map((node) => ({ ...node, varietyIds: serializeSet(node.varietyIds), sourceNames: serializeSet(node.sourceNames) })),
  varieties: [...varieties.values()].map((node) => ({ ...node, sourceNames: serializeSet(node.sourceNames) })),
  specimens,
  recordMap,
  stats: {
    sourceRecords: records.length,
    periods: periods.length,
    authorities: authorities.size,
    denominations: denominations.size,
    coinTypes: coinTypes.size,
    issues: issues.size,
    varieties: varieties.size,
    specimens: specimens.length,
    multiSourceCoinTypes: [...coinTypes.values()].filter((node) => node.sourceNames.size >= 2).length,
    multiSourceIssues: [...issues.values()].filter((node) => node.sourceNames.size >= 2).length,
    multiSourceVarieties: [...varieties.values()].filter((node) => node.sourceNames.size >= 2).length,
    reviewFlaggedCoinTypes: [...coinTypes.values()].filter((node) => node.reviewFlags.size > 0).length,
    recordsWithImages: specimens.filter((node) => node.imageCount > 0).length,
    recordsWithImagePair: specimens.filter((node) => node.imageCount >= 2).length,
  },
};

await mkdir(dirname(OUTPUT), { recursive: true });
await writeFile(OUTPUT, gzipSync(`${JSON.stringify(result)}\n`, { level: 9 }));
const runtimeRecordMap = Object.fromEntries(Object.entries(result.recordMap).map(([recordId, hierarchyIds]) => [
  recordId,
  {
    coinTypeId: hierarchyIds.coinTypeId,
    issueId: hierarchyIds.issueId,
    varietyId: hierarchyIds.varietyId,
    specimenId: hierarchyIds.specimenId,
    periodId: hierarchyIds.periodId,
  },
]));
await writeFile(RUNTIME_OUTPUT, gzipSync(`${JSON.stringify({
  schemaVersion: result.schemaVersion,
  generatedAt: result.generatedAt,
  stats: result.stats,
  recordMap: runtimeRecordMap,
})}\n`, { level: 9 }));
console.log(JSON.stringify(result.stats, null, 2));
console.log(`[hierarchy] zapisano ${OUTPUT}`);
console.log(`[hierarchy] zapisano ${RUNTIME_OUTPUT}`);
