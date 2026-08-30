import test from "node:test";
import assert from "node:assert/strict";
import { gunzipSync } from "node:zlib";
import { readFile } from "node:fs/promises";
import {
  localReferenceCandidates,
  recognitionCatalogPolicy,
} from "../lib/recognition-core.mjs";

const catalog = JSON.parse(
  gunzipSync(
    await readFile(new URL("../data/recognition/third-republic-open-catalog-v1.json.gz", import.meta.url)),
  ).toString("utf8"),
);

test("open III Republic catalogue adds the missing modern coin families", () => {
  assert.equal(catalog.records.length, 896);
  assert.deepEqual(catalog.stats.byFamily, {
    "commemorative-2-zl": 260,
    "discover-poland-5-zl": 16,
    "bullion-bielik": 96,
    "collector-annual": 524,
  });
  assert.equal(recognitionCatalogPolicy.thirdRepublicOpenRecordCount, 896);
  assert.equal(recognitionCatalogPolicy.commemorativeTwoZlotyRecordCount, 260);
  assert.equal(recognitionCatalogPolicy.discoverPolandFiveZlotyRecordCount, 16);
  assert.equal(recognitionCatalogPolicy.bullionBielikRecordCount, 96);
});

test("every imported modern record has measurements, mintage and revision provenance", () => {
  for (const record of catalog.records) {
    assert.ok(record.year >= "1995" && record.year <= "2024", record.id);
    assert.ok(record.weightGrams > 0, record.id);
    assert.ok(record.diameterMm > 0 || record.dimensionsMm?.length >= 2, record.id);
    assert.ok(record.mintage > 0, record.id);
    assert.deepEqual(record.images, []);
    assert.equal(record.source.rightsCode, "explicit-open-license");
    assert.equal(record.source.restricted, false);
    assert.match(record.source.url, /^https:\/\/pl\.wikipedia\.org\/w\/index\.php\?.*oldid=\d+$/);
    assert.match(record.source.recordId, /pageid:\d+; revid:\d+; family:/);
  }
});

test("Jeździec Piastowski remains three separate, correctly metrologized candidates", () => {
  const records = localReferenceCandidates().filter((record) =>
    record.year === "2006" && /jeździec piastowski/i.test(record.title));
  assert.deepEqual(
    records.map((record) => record.nominal).sort(),
    ["10 zł", "2 zł", "200 zł"],
  );
  assert.equal(records.find((record) => record.nominal === "2 zł")?.mintage, 1_000_000);
  assert.deepEqual(records.find((record) => record.nominal === "10 zł")?.dimensionsMm, [32, 22]);
  assert.equal(records.find((record) => record.nominal === "200 zł")?.metal, "Au 900");
});

test("Orzeł Bielik candidates preserve denomination-specific bullion measurements", () => {
  const records = localReferenceCandidates().filter((record) =>
    record.coinClass === "bullion" && record.year === "1995");
  assert.deepEqual(records.map((record) => record.nominal).sort(), ["100 zł", "200 zł", "50 zł", "500 zł"]);
  assert.equal(records.find((record) => record.nominal === "50 zł")?.weightGrams, 3.1);
  assert.equal(records.find((record) => record.nominal === "500 zł")?.weightGrams, 31.1);
  assert.ok(records.every((record) => record.metal === "Złoto Au 999,9"));
});

test("visual-technology note rows enrich a coin instead of becoming phantom records", () => {
  const records = catalog.records.filter((record) =>
    record.year === "2006" && record.nominal === "10 zł" && record.title.includes("Jeździec piastowski"));
  assert.equal(records.length, 1);
  assert.match(records[0].variant, /klipy prostokątnej/);
  assert.ok(records[0].diagnosticMarkers.some((marker) => /klipy prostokątnej/.test(marker)));
});
