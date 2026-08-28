import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";

const catalog = JSON.parse(
  gunzipSync(
    await readFile(new URL("../data/recognition/mnw-polish-catalog-v1.json.gz", import.meta.url)),
  ).toString("utf8"),
);

test("MNW importer keeps a large simultaneous Polish-coin and public-domain slice", () => {
  assert.ok(catalog.stats.publicDomainPolishCoinObjects >= 7_900);
  assert.ok(catalog.records.length >= 7_700);
  assert.equal(catalog.stats.acceptedCoinRecords, catalog.records.length);
  assert.ok(catalog.stats.rejectedWithoutRecognizedNominal <= 150);
  assert.ok(catalog.stats.withRuler >= 7_700);
  assert.ok(catalog.stats.withYear >= 7_700);
  assert.ok(catalog.stats.withMint >= 7_700);
  assert.ok(catalog.stats.withMintmasterOrManager >= 1_400);
  assert.equal(catalog.stats.withOpenImage, catalog.records.length);
});

test("every MNW runtime record carries item provenance and explicit public-domain rights", () => {
  for (const record of catalog.records) {
    assert.ok(record.nominal, record.id);
    assert.equal(record.source.type, "museum");
    assert.equal(record.source.rightsCode, "public-domain");
    assert.equal(record.source.restricted, false);
    assert.match(record.source.url, /^https:\/\/cyfrowe\.mnw\.art\.pl\/pl\/zbiory\/\d+$/);
    assert.match(record.source.acquisitionEndpoint, /filter\[keywords\]\[\]=175926/);
    assert.match(record.source.acquisitionEndpoint, /filter\[copyrights\]\[\]=500/);
    assert.equal(record.images.length, 1);
    assert.equal(record.imageRights.length, 1);
    assert.match(record.images[0], /^https:\/\/cyfrowe-cdn\.mnw\.art\.pl\//);
    assert.equal(record.imageRights[0].license, "Domena publiczna");
    assert.equal("description" in record, false);
    assert.doesNotMatch(record.title, /\b(?:falsyfikat|fałszerstwo|kopia|nowe bicie|replika)\b/i);
  }
});

test("a verified Zygmunt III record retains the basic identity and mint manager", () => {
  const record = catalog.records.find((candidate) => candidate.id === "mnw:586776");
  assert.ok(record);
  assert.equal(record.nominal, "Dukat");
  assert.equal(record.ruler, "Zygmunt III Waza");
  assert.equal(record.year, "1631");
  assert.equal(record.mint, "Gdańsk");
  assert.match(record.diagnosticMarkers.join(" "), /zarządca-mennicy:Bermann/);
});
