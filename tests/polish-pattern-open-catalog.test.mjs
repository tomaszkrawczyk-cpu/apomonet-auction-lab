import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";
import {
  localReferenceCandidates,
  rankEvidenceCandidates,
  recognitionCatalogPolicy,
} from "../lib/recognition-core.mjs";

const catalog = JSON.parse(
  gunzipSync(
    await readFile(new URL("../data/recognition/polish-pattern-open-catalog-v1.json.gz", import.meta.url)),
  ).toString("utf8"),
);

const candidates = localReferenceCandidates();
const patternCandidates = candidates.filter((record) => record.id.startsWith("pattern-open:"));

test("open Polish pattern catalogue covers the three principal post-war series", () => {
  assert.equal(catalog.records.length, 502);
  assert.deepEqual(catalog.stats.bySeries, {
    "collector-pattern": 100,
    "brass-pattern": 13,
    "nickel-pattern": 389,
  });
  assert.deepEqual(catalog.stats.byPeriod, {
    "people-republic": 424,
    "third-republic": 78,
  });
  assert.equal(catalog.stats.withWeight, 502);
  assert.equal(catalog.stats.withDiameter, 502);
  assert.equal(patternCandidates.length, catalog.records.length);
  assert.equal(recognitionCatalogPolicy.patternRecordCount, catalog.records.length);
  assert.equal(recognitionCatalogPolicy.peopleRepublicPatternRecordCount, 424);
  assert.ok(recognitionCatalogPolicy.allPatternCandidateCount >= 598);
});

test("every pattern record has revision provenance and excludes protected catalogue fields", () => {
  assert.equal(new Set(catalog.records.map((record) => record.id)).size, catalog.records.length);
  assert.equal(new Set(catalog.records.map((record) => record.source.recordId)).size, catalog.records.length);
  for (const record of catalog.records) {
    assert.ok(Number(record.year) >= 1949 && Number(record.year) <= 1994, record.id);
    assert.equal(record.objectKind, "pattern");
    assert.equal(record.coinClass, "pattern");
    assert.ok(record.weightGrams > 0, record.id);
    assert.ok(record.diameterMm > 0, record.id);
    assert.equal(record.source.rightsCode, "explicit-open-license");
    assert.equal(record.source.restricted, false);
    assert.match(record.source.recordId, /^pageid:\d+; revid:\d+; row:\d+(?:-\d+)?$/);
    assert.match(record.source.rights, /bez numerów współczesnych katalogów/);
    assert.equal(record.catalogReference, undefined);
    assert.equal(record.parchimowiczReference, undefined);
    assert.equal(record.images.length, record.imageRights.length);
    for (const image of record.images) assert.match(image, /^https:\/\/upload\.wikimedia\.org\//);
  }
});

test("only item-level open Commons images enter the pattern catalogue", () => {
  assert.equal(catalog.stats.withImages, 13);
  for (const record of catalog.records.filter((record) => record.images.length)) {
    for (const rights of record.imageRights) {
      assert.match(rights.sourceUrl, /^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
      assert.match(rights.license.toLowerCase(), /^(?:cc|public domain|pd)/);
    }
  }
});

test("PRÓBA evidence separates a brass 1949 pattern from the circulation coin", () => {
  const ranked = rankEvidenceCandidates({
    rulerReading: "Polska Rzeczpospolita Ludowa",
    yearReading: "1949",
    denominationReading: "1 grosz",
    mintReading: "Warszawa",
    metalAppearance: "mosiądz",
    shape: "okrągła",
    portrait: "wklęsły napis PRÓBA",
    obverseLegendFragments: ["POLSKA RZECZPOSPOLITA LUDOWA", "1949", "PRÓBA"],
    reverseLegendFragments: ["1 GROSZ"],
  }, candidates, {
    weightGrams: 1.3,
    diameterMm: 14.7,
  });
  assert.equal(ranked.selected?.candidate.id, "pattern-open:7f327e39b7615f95");
  assert.equal(ranked.selected?.candidate.patternSeries, "brass-pattern");
});

test("exceptional collector pattern without the PRÓBA mark remains explicit", () => {
  const record = catalog.records.find((candidate) =>
    candidate.year === "1964" &&
    candidate.nominal === "10 zł" &&
    candidate.variant.startsWith("bez napisu PRÓBA"));
  assert.ok(record);
  assert.match(record.portrait, /Kazimierz Wielki/);
  assert.equal(record.weightGrams, 12.9);
  assert.equal(record.diameterMm, 31);
});
