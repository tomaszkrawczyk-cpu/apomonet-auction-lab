import test from "node:test";
import assert from "node:assert/strict";
import catalog from "../data/recognition/nbp-eli-current-catalog-v1.json" with { type: "json" };
import {
  localReferenceCandidates,
  recognitionCatalogPolicy,
} from "../lib/recognition-core.mjs";

test("official ELI bridge covers every reviewed Polish coin issue from 2023 through 2025", () => {
  assert.equal(catalog.records.length, 72);
  assert.deepEqual(catalog.stats, {
    records: 72,
    issueGroups: 60,
    legalActs: 60,
    withMeasurements: 72,
    withImages: 0,
  });
  assert.equal(new Set(catalog.records.map((record) => record.id)).size, 72);
  assert.equal(recognitionCatalogPolicy.currentPolishIssueRecordCount, 83);
  assert.deepEqual(recognitionCatalogPolicy.currentPolishIssueYears, ["2023", "2024", "2025", "2026"]);
});

test("current facts retain official provenance without importing descriptions or images", () => {
  for (const record of catalog.records) {
    assert.ok(["2023", "2024", "2025"].includes(record.year), record.id);
    assert.equal(record.ruler, "Narodowy Bank Polski", record.id);
    assert.equal(record.mint, "Warszawa", record.id);
    assert.ok(record.weightGrams > 0, record.id);
    assert.ok(record.diameterMm > 0 || record.dimensionsMm.length >= 2, record.id);
    assert.ok(record.mintage > 0, record.id);
    assert.deepEqual(record.images, []);
    assert.equal(record.source.rightsCode, "factual-metadata-only");
    assert.equal(record.source.restricted, false);
    assert.match(record.source.url, /^https:\/\/eli\.gov\.pl\/eli\/MP\/20(?:23|24|25)\/\d+\/ogl$/);
    assert.match(record.source.rights, /bez opisów i ilustracji/);
    assert.equal(record.verificationSources.length, 2);
  }
});

test("an act published in 2023 retains the actual 2024 coin issue year", () => {
  const banknote20 = catalog.records.find((record) => record.source.recordId === "MP/2023/1458");
  assert.equal(banknote20?.year, "2024");
  assert.equal(banknote20?.issueDate, "2024-01-23");
  assert.match(banknote20?.verificationSources[1].url || "", /plan-2024-pl\.pdf$/);
});

test("multi-denomination 2024 acts remain separate recognition candidates", () => {
  const kosciuszko = localReferenceCandidates().filter((record) =>
    record.sourceReference === "MP/2024/332");
  assert.deepEqual(
    kosciuszko.map((record) => record.nominal).sort(),
    ["100 zł", "50 zł"],
  );
});

test("multi-denomination 2025 acts remain separate recognition candidates", () => {
  const candidates = localReferenceCandidates();
  const boleslaw = candidates.filter((record) =>
    record.year === "2025" && record.title.includes("Tysiąclecie koronacji Bolesława Chrobrego"));
  assert.deepEqual(
    boleslaw.map((record) => record.nominal).sort(),
    ["10 zł", "100 zł", "500 zł"],
  );
  assert.ok(boleslaw.every((record) => record.sourceReference === "MP/2025/297"));
});

test("Europeana dates from 1949 onward cannot impersonate PRL or current minting years", () => {
  const candidates = localReferenceCandidates().filter((record) =>
    record.sourceDateRejectedAsMintYear);
  assert.ok(candidates.length >= 15);
  for (const record of candidates) {
    assert.equal(record.year, "", record.id);
    assert.match(record.sourceDateRejectedAsMintYear, /^(?:19[4-9]\d|20\d{2})$/);
    assert.doesNotMatch(record.title, /,\s*(?:19[4-9]\d|20\d{2})(?:,|$)/);
  }
});
