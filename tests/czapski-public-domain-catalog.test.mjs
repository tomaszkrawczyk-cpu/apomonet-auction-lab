import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";

const catalog = JSON.parse(
  gunzipSync(
    await readFile(new URL("../data/recognition/czapski-public-domain-catalog-v1.json.gz", import.meta.url)),
  ).toString("utf8"),
);

test("Czapski importer covers all public-domain volumes and keeps only useful identity candidates", () => {
  assert.equal(catalog.stats.inputVolumes, 5);
  assert.ok(catalog.stats.scannedPages >= 1_950);
  assert.ok(catalog.stats.selectedCatalogEntries >= 7_600);
  assert.ok(catalog.records.length >= 2_850);
  assert.equal(catalog.stats.acceptedCoinRecords, catalog.records.length);
  assert.ok(catalog.stats.withRuler >= 1_950);
  assert.ok(catalog.stats.withMint >= 900);
  assert.ok(catalog.stats.withLegends >= 950);
});

test("Czapski records contain transformed facts, provenance and no copied scans or prose", () => {
  for (const record of catalog.records) {
    assert.ok(record.nominal, record.id);
    assert.deepEqual(record.images, []);
    assert.equal(record.source.rightsCode, "public-domain");
    assert.equal(record.source.restricted, false);
    assert.equal(record.source.extractionConfidence, "ocr-structured-candidate");
    assert.match(record.source.recordId, /^H-Cz [1-5] \d+; strona skanu \d+$/);
    assert.match(record.source.url, /^https:\/\/kpbc\.umk\.pl\/dlibra\/doccontent\?id=\d+#page=\d+$/);
    assert.equal("description" in record, false);
    if (record.year) assert.ok(Number(record.year) >= 1500, `${record.id}: ${record.year}`);
  }
});

test("the first medieval entry is not polluted by a biography year or French prose", () => {
  const record = catalog.records.find((candidate) =>
    candidate.diagnosticMarkers.includes("katalog:H-Cz 1 6"));
  assert.ok(record);
  assert.equal(record.nominal, "Denar");
  assert.equal(record.ruler, "Kazimierz I Odnowiciel");
  assert.equal(record.year, "");
  assert.notEqual(record.objectKind, "pattern-coin");
});
