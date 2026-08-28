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
    await readFile(new URL("../data/recognition/prl-open-catalog-v1.json.gz", import.meta.url)),
  ).toString("utf8"),
);

const prlCandidates = localReferenceCandidates().filter((record) => record.id.startsWith("prl-open:"));

test("PRL catalogue has useful scale, classes and year-specific records", () => {
  assert.equal(catalog.records.length, 257);
  assert.equal(catalog.stats.uniqueTypes, 92);
  assert.deepEqual(catalog.stats.byClass, {
    circulation: 198,
    collector: 11,
    commemorative: 48,
  });
  assert.equal(catalog.stats.withOfficialLegalReferences, 244);
  assert.equal(new Set(catalog.records.map((record) => record.id)).size, catalog.records.length);
  assert.equal(new Set(catalog.records.map((record) => record.source.recordId)).size, catalog.records.length);
  assert.equal(prlCandidates.length, catalog.records.length);
  assert.equal(recognitionCatalogPolicy.peopleRepublicRecordCount, catalog.records.length);
  assert.equal(recognitionCatalogPolicy.catalogCount, 4);

  for (const record of catalog.records) {
    assert.ok(Number(record.year) >= 1949 && Number(record.year) <= 1989, record.id);
    assert.equal(record.period, "people-republic");
    assert.match(record.objectKind, /^(coin|pattern)$/);
    assert.match(record.coinClass, /^(circulation|commemorative|collector|pattern)$/);
    assert.ok(record.nominal, `missing nominal: ${record.id}`);
    assert.ok(record.metal, `missing metal: ${record.id}`);
    assert.ok(record.weightGrams > 0, `missing weight: ${record.id}`);
    assert.ok(record.diameterMm > 0, `missing diameter: ${record.id}`);
    assert.equal(record.source.rightsCode, "explicit-open-license");
    assert.equal(record.source.restricted, false);
    assert.match(record.source.recordId, /pageid:\d+; revid:\d+; year:19\d{2}; variant:\d+/);
    assert.equal(record.images.length, record.imageRights.length);
  }
});

test("official legal provenance and image rights are retained per record", () => {
  const withLaw = catalog.records.filter((record) => record.legalReferences.length);
  assert.ok(withLaw.length >= 240);
  for (const record of withLaw) {
    for (const reference of record.legalReferences) {
      assert.match(reference.id, /^(MP|DU) 19\d{2} nr \d+ poz\. \d+$/);
      assert.match(reference.url, /^https:\/\/eli\.gov\.pl\/eli\/(?:MP|DU)\/19\d{2}\/\d+\/ogl$/);
    }
  }

  const withImages = catalog.records.filter((record) => record.images.length);
  assert.equal(withImages.length, 15);
  for (const record of withImages) {
    for (const rights of record.imageRights) {
      assert.match(rights.sourceUrl, /^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
      assert.match(rights.license.toLowerCase(), /^(?:cc|public domain|pd)/);
      if (record.coinClass !== "pattern") {
        assert.doesNotMatch(decodeURIComponent(rights.sourceUrl), /\bPRÓBA\b/i);
      }
    }
  }
});

test("1949 aluminium and heavier metal variants remain separate", () => {
  const oneZloty = catalog.records.filter((record) => record.year === "1949" && record.nominal === "1 zł");
  const fiveGroszy = catalog.records.filter((record) => record.year === "1949" && record.nominal === "5 gr");
  assert.deepEqual(oneZloty.map((record) => [record.metal, record.weightGrams]).sort(), [
    ["alupolon", 2.12],
    ["miedzionikiel", 7],
  ]);
  assert.deepEqual(fiveGroszy.map((record) => [record.metal, record.weightGrams]).sort(), [
    ["alupolon", 1],
    ["brąz", 3],
  ]);

  const observations = {
    rulerReading: "Polska Rzeczpospolita Ludowa",
    yearReading: "1949",
    denominationReading: "1 zł",
    mintReading: "Warszawa",
    metalAppearance: "aluminium",
    shape: "okrągła",
  };
  const ranked = rankEvidenceCandidates(observations, prlCandidates, {
    weightGrams: 2.12,
    diameterMm: 25,
  });
  assert.equal(ranked.selected?.candidate.metal, "alupolon");
  assert.equal(ranked.selected?.candidate.year, "1949");
});

test("diagnostic subject separates same-year PRL commemorative types", () => {
  const observations = {
    rulerReading: "Polska Rzeczpospolita Ludowa",
    yearReading: "1969",
    denominationReading: "10 zł",
    mintReading: "Warszawa",
    metalAppearance: "miedzionikiel",
    shape: "okrągła",
    portrait: "25 rocznica Polskiej Rzeczypospolitej Ludowej",
    obverseLegendFragments: ["POLSKA RZECZPOSPOLITA LUDOWA", "1969"],
    reverseLegendFragments: ["XXV LAT PRL", "10 ZŁ"],
  };
  const ranked = rankEvidenceCandidates(observations, prlCandidates, {
    weightGrams: 9.5,
    diameterMm: 28,
  });
  assert.equal(ranked.selected?.candidate.id, "prl-open:5f35df1255ec8c48");
  assert.match(ranked.selected?.candidate.title || "", /Dwudziesta piąta rocznica PRL/);
});
