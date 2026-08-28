import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";
import nbpCatalog from "../data/recognition/nbp-official-catalog-v1.json" with { type: "json" };
import {
  localReferenceCandidates,
  recognitionCatalogPolicy,
} from "../lib/recognition-core.mjs";

const mnkCatalog = JSON.parse(
  gunzipSync(
    await readFile(new URL("../data/recognition/mnk-polish-catalog-v1.json.gz", import.meta.url)),
  ).toString("utf8"),
);

const prlCatalog = JSON.parse(
  gunzipSync(
    await readFile(new URL("../data/recognition/prl-open-catalog-v1.json.gz", import.meta.url)),
  ).toString("utf8"),
);

test("bulk catalogue covers Polish coinage from the medieval period through 2026", () => {
  assert.ok(mnkCatalog.records.length >= 2_100);
  assert.ok(recognitionCatalogPolicy.recordCount >= 2_400);
  for (const period of [
    "medieval-piast",
    "jagiellonian",
    "elective-monarchy",
    "partitions-and-uprisings",
    "second-republic-and-war",
    "people-republic",
    "third-republic",
  ]) {
    assert.ok(mnkCatalog.stats.byPeriod[period] > 0, `missing period: ${period}`);
  }
  assert.equal(nbpCatalog.records.length, 10);
  assert.equal(prlCatalog.records.length, 257);
  assert.equal(prlCatalog.stats.uniqueTypes, 92);
  assert.equal(recognitionCatalogPolicy.peopleRepublicRecordCount, 257);
  assert.ok(nbpCatalog.records.every((record) => record.year === "2026"));
});

test("museum images and every source record pass explicit item-level rights gates", () => {
  assert.ok(mnkCatalog.stats.withTwoSideImages >= 2_000);
  for (const record of mnkCatalog.records) {
    assert.equal(record.source.rightsCode, "public-domain");
    assert.equal(record.source.restricted, false);
    assert.match(record.source.url, /^https:\/\/zbiory\.mnk\.pl\/pl\/katalog\/\d+$/);
    for (const image of record.images) {
      assert.match(image, /^https:\/\/cdn-zbiory\.mnk\.pl\//);
    }
  }
  for (const record of nbpCatalog.records) {
    assert.equal(record.source.rightsCode, "factual-metadata-only");
    assert.deepEqual(record.images, []);
  }
});

test("counterfeits and non-coins never enter the positive identification catalogue", () => {
  const forbidden = /\b(fałszyw|falsyfikat|kopia|replika|medal|żeton|banknot|odważnik)\w*/i;
  for (const record of mnkCatalog.records) {
    assert.ok(record.nominal, `missing nominal: ${record.id}`);
    assert.doesNotMatch(record.title, forbidden);
  }
});

test("separate NBP denominations sharing one official page are not deduplicated", () => {
  const candidates = localReferenceCandidates();
  assert.ok(candidates.some((record) => record.id === "nbp:2026-hetmani-jan-tarnowski-500-zl"));
  assert.ok(candidates.some((record) => record.id === "nbp:2026-hetmani-jan-tarnowski-10-zl"));
});

test("vision starts without arbitrary local-name anchoring and can compare public-domain reference pairs", async () => {
  const source = await readFile(new URL("../api/analyze.js", import.meta.url), "utf8");
  assert.match(source, /let candidates = numista\.candidates\.slice\(0, 8\)/);
  assert.doesNotMatch(source, /\[\.\.\.numista\.candidates, \.\.\.localCandidates\]\.slice/);
  assert.match(source, /compareWithReferenceImages/);
  assert.match(source, /candidate\.images\[0\]/);
  assert.match(source, /candidate\.images\[1\]/);
});
