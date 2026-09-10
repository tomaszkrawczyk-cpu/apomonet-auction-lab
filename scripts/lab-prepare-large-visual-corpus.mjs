#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const GENERATED_AT = "2026-09-10";
const OUTPUT = resolve(ROOT, "lab/corpus/visual-corpus-manifest-" + GENERATED_AT + ".json");
const INPUTS = [
  "data/recognition/mnk-polish-catalog-v1.json.gz",
  "data/recognition/mnw-polish-catalog-v1.json.gz",
  "data/recognition/ikmk-polish-catalog-v1.json.gz",
  "data/recognition/prl-open-catalog-v1.json.gz",
  "data/recognition/polish-pattern-open-catalog-v1.json.gz",
  "data/recognition/negative-visual-open-catalog-v1.json.gz",
];
const ACCEPTED_RIGHTS = new Set(["public-domain", "explicit-open-license"]);
const TARGET = 500;
const QUOTAS = {
  medieval: 70,
  royal: 180,
  partitions: 70,
  "second-republic-and-war": 55,
  "people-republic": 65,
  contemporary: 60,
};

function load(relativePath) {
  return JSON.parse(gunzipSync(readFileSync(resolve(ROOT, relativePath))).toString("utf8"));
}
function text(value) {
  return String(value ?? "").trim();
}
function norm(value) {
  return text(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
function yearNumber(record) {
  for (const value of [record.year, record.yearStart, ...(record.yearRange || [])]) {
    const match = text(value).match(/(?:^|\D)(9\d{2}|1\d{3}|20\d{2})(?:\D|$)/);
    if (match) return Number(match[1]);
  }
  return null;
}
function periodOf(record) {
  const explicit = norm(record.period);
  if (/medieval|piast/.test(explicit)) return "medieval";
  if (/jagiellonian|elective monarchy/.test(explicit)) return "royal";
  if (/partition|uprising/.test(explicit)) return "partitions";
  if (/second republic|war/.test(explicit)) return "second-republic-and-war";
  if (/people republic/.test(explicit)) return "people-republic";
  if (/third republic/.test(explicit)) return "contemporary";
  const year = yearNumber(record);
  if (year == null) return "undated";
  if (year <= 1500) return "medieval";
  if (year <= 1795) return "royal";
  if (year <= 1918) return "partitions";
  if (year <= 1945) return "second-republic-and-war";
  if (year <= 1989) return "people-republic";
  return "contemporary";
}
function imageRows(record) {
  const raw = [];
  if (Array.isArray(record.images)) raw.push(...record.images);
  if (record.image) raw.push(record.image);
  if (record.imageUrl) raw.push(record.imageUrl);
  const rows = [];
  for (const [index, item] of raw.entries()) {
    const url = typeof item === "string" ? item : item?.url || item?.imageUrl;
    if (!url || !/^https:\/\//i.test(url)) continue;
    rows.push({
      url,
      side: typeof item === "object" ? item?.side || "image-" + (index + 1) : "image-" + (index + 1),
      rights: (typeof item === "object" ? item?.rights || item?.license : "") || record.source?.rights || "",
      rightsCode: record.source?.rightsCode || "",
    });
  }
  return [...new Map(rows.map((row) => [row.url, row])).values()];
}
function recordId(record) {
  return text(record.source?.recordId || record.id);
}
function canonicalKey(record) {
  const year = yearNumber(record);
  const ruler = norm(record.ruler || record.issuer || record.country);
  const nominal = norm(record.nominal || record.title);
  const mint = norm(record.mint);
  if (!year || !nominal) return "";
  return [ruler || "unknown", year, nominal, mint || "unknown"].join("|");
}
function digest(value) {
  return createHash("sha1").update(value).digest("hex").slice(0, 16);
}
function isAllowed(record, images) {
  if (!images.length || record.source?.restricted) return false;
  if (ACCEPTED_RIGHTS.has(record.source?.rightsCode)) return true;
  return images.every((image) => /public domain|domena publiczna|pdm|cc\s*by|cc0/i.test(image.rights));
}
function stableSort(groups) {
  return [...groups].sort((a, b) => {
    return Number(b.twoSideMembers) - Number(a.twoSideMembers)
      || b.sourceCount - a.sourceCount
      || b.members.length - a.members.length
      || a.key.localeCompare(b.key, "pl");
  });
}

const sourceStats = [];
const usable = [];
for (const relativePath of INPUTS) {
  const payload = load(relativePath);
  const records = payload.records || [];
  let withImages = 0;
  let accepted = 0;
  const urls = new Set();
  for (const record of records) {
    const images = imageRows(record);
    if (images.length) withImages += 1;
    images.forEach((image) => urls.add(image.url));
    if (!isAllowed(record, images)) continue;
    accepted += 1;
    usable.push({
      id: text(record.id),
      sourceFile: relativePath,
      sourceName: text(record.source?.name),
      sourceRecordId: recordId(record),
      sourceUrl: text(record.source?.url),
      rights: text(record.source?.rights),
      rightsCode: text(record.source?.rightsCode),
      title: text(record.title),
      ruler: text(record.ruler),
      year: text(record.year),
      nominal: text(record.nominal),
      mint: text(record.mint),
      metal: text(record.metal),
      weightGrams: record.weightGrams ?? null,
      diameterMm: record.diameterMm ?? null,
      portrait: text(record.portrait),
      obverseLegend: text(record.obverseLegend),
      reverseLegend: text(record.reverseLegend),
      diagnosticMarkers: Array.isArray(record.diagnosticMarkers) ? record.diagnosticMarkers : [],
      period: periodOf(record),
      images,
      canonicalKey: canonicalKey(record),
    });
  }
  sourceStats.push({
    file: relativePath,
    records: records.length,
    recordsWithImages: withImages,
    rightsAcceptedRecords: accepted,
    uniqueImageUrls: urls.size,
  });
}

const byKey = new Map();
for (const record of usable) {
  if (!record.canonicalKey) continue;
  const list = byKey.get(record.canonicalKey) || [];
  list.push(record);
  byKey.set(record.canonicalKey, list);
}

const eligible = [];
for (const [key, members] of byKey) {
  const uniqueRecords = [...new Map(members.map((record) => [
    record.sourceName + "|" + record.sourceRecordId,
    record,
  ])).values()];
  const uniqueImages = new Set(uniqueRecords.flatMap((record) => record.images.map((image) => image.url)));
  if (uniqueRecords.length < 2 || uniqueImages.size < 2) continue;
  const period = uniqueRecords.find((record) => record.period !== "undated")?.period || "undated";
  eligible.push({
    key,
    period,
    members: uniqueRecords,
    sourceCount: new Set(uniqueRecords.map((record) => record.sourceName)).size,
    twoSideMembers: uniqueRecords.filter((record) => record.images.length >= 2).length,
  });
}

const selected = [];
const selectedKeys = new Set();
for (const [period, quota] of Object.entries(QUOTAS)) {
  for (const group of stableSort(eligible.filter((candidate) => candidate.period === period)).slice(0, quota)) {
    selected.push(group);
    selectedKeys.add(group.key);
  }
}
if (selected.length < TARGET) {
  for (const group of stableSort(eligible.filter((candidate) => !selectedKeys.has(candidate.key)))) {
    selected.push(group);
    selectedKeys.add(group.key);
    if (selected.length >= TARGET) break;
  }
}

function compact(record) {
  return {
    id: record.id,
    sourceName: record.sourceName,
    sourceRecordId: record.sourceRecordId,
    sourceUrl: record.sourceUrl,
    rights: record.rights,
    rightsCode: record.rightsCode,
    title: record.title,
    ruler: record.ruler,
    year: record.year,
    nominal: record.nominal,
    mint: record.mint,
    metal: record.metal,
    weightGrams: record.weightGrams,
    diameterMm: record.diameterMm,
    portrait: record.portrait,
    obverseLegend: record.obverseLegend,
    reverseLegend: record.reverseLegend,
    diagnosticMarkers: record.diagnosticMarkers,
    images: record.images,
  };
}
const corpus = selected.map((group) => {
  const ranked = [...group.members].sort((a, b) => b.images.length - a.images.length || a.id.localeCompare(b.id));
  const reference = ranked[0];
  const query = ranked.find((candidate) => candidate.id !== reference.id) || ranked[1];
  return {
    typeId: "lab-type:" + digest(group.key),
    identityKey: group.key,
    period: group.period,
    memberCount: group.members.length,
    sourceCount: group.sourceCount,
    reference: compact(reference),
    query: compact(query),
    additionalMembers: ranked.slice(2, 5).map(compact),
  };
});
function countBy(items, pick) {
  const counts = new Map();
  for (const item of items) counts.set(pick(item), (counts.get(pick(item)) || 0) + 1);
  return Object.fromEntries([...counts].sort(([a], [b]) => String(a).localeCompare(String(b), "pl")));
}

const output = {
  schemaVersion: 1,
  generatedAt: GENERATED_AT,
  purpose: "Stratified, rights-gated cross-specimen visual benchmark manifest. No production wiring.",
  policy: {
    acceptedRightsCodes: [...ACCEPTED_RIGHTS],
    queryAndReferenceMustUseDifferentMuseumRecords: true,
    liveWebSearchDuringIdentification: false,
    productionChanges: false,
  },
  stats: {
    sourceStats,
    rightsAcceptedImageRecords: usable.length,
    uniqueImageUrls: new Set(usable.flatMap((record) => record.images.map((image) => image.url))).size,
    canonicalIdentityGroups: byKey.size,
    crossSpecimenEligibleGroups: eligible.length,
    selectedTypes: corpus.length,
    selectedByPeriod: countBy(corpus, (item) => item.period),
    selectedReferenceImages: corpus.reduce((sum, item) => sum + item.reference.images.length, 0),
    selectedQueryImages: corpus.reduce((sum, item) => sum + item.query.images.length, 0),
  },
  limitations: [
    "Identity grouping is deliberately conservative and based on normalized ruler/year/nominal/mint metadata.",
    "The manifest proves availability and separation of museum specimens; image bytes still require a permitted download runtime before visual scoring.",
    "A source URL or open license does not by itself prove that the image is reachable at benchmark time.",
  ],
  corpus,
};

mkdirSync(dirname(OUTPUT), { recursive: true });
writeFileSync(OUTPUT, JSON.stringify(output, null, 2) + "\n");
console.log(JSON.stringify({ output: OUTPUT, stats: output.stats }, null, 2));
