import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";

const catalog = JSON.parse(
  gunzipSync(
    await readFile(new URL("../data/recognition/ikmk-polish-catalog-v1.json.gz", import.meta.url)),
  ).toString("utf8"),
);
const bySourceId = new Map(catalog.records.map((record) => [record.source.recordId, record]));

const expectedNominals = new Map([
  ["18201941", "10 dukatów"],
  ["18202240", "10 dukatów"],
  ["18223471", "5 dukatów"],
  ["18223427", "10 dukatów"],
  ["18215922", "10 dukatów"],
  ["18297149", "3 dukaty"],
  ["18245473", "6 dukatów"],
  ["18227317", "30 dukatów"],
  ["18215924", "5 dukatów"],
  ["18223440", "10 dukatów"],
  ["18244673", "5 dukatów"],
  ["18237022", "3 dukaty"],
  ["18237019", "4 dukaty"],
  ["18244668", "3 dukaty"],
  ["18203617", "10 dukatów"],
]);

test("IKMK multiple ducats retain their actual denomination instead of collapsing to one ducat", () => {
  let withLegend = 0;
  for (const [sourceId, expected] of expectedNominals) {
    const record = bySourceId.get(sourceId);
    assert.ok(record, `missing IKMK ${sourceId}`);
    assert.equal(record.nominal, expected, sourceId);
    assert.match(record.sourceNominal, /ducat|dukat/i);
    assert.ok(record.weightGrams >= 10, sourceId);
    if (record.obverseLegend || record.reverseLegend) withLegend += 1;
  }
  // One source record currently lacks a legend transcription; the identity is
  // still resolved by its explicit IKMK denomination and metrology.
  assert.ok(withLegend >= expectedNominals.size - 1);
  assert.ok(catalog.stats.multipleDucatRecords >= expectedNominals.size);
});

test("a countermarked silver ducato is not misclassified as a gold ducat", () => {
  const record = bySourceId.get("18215931");
  assert.ok(record);
  assert.equal(record.nominal, "Ducato srebrne");
  assert.equal(record.sourceNominal, "Ducato (AR)");
  assert.equal(record.metal, "srebro");
  assert.equal(record.weightGrams, 29.21);
  assert.match(record.reverseLegend, /HILARI/i);
  assert.ok(catalog.stats.silverDucatoRecords >= 1);
});

test("IKMK legend transcriptions carry explicit record-level attribution", () => {
  assert.ok(catalog.stats.withObverseLegend >= 400);
  assert.ok(catalog.stats.withReverseLegend >= 400);
  for (const record of catalog.records.filter((item) => item.obverseLegend || item.reverseLegend)) {
    assert.equal(record.source.legendRights, "CC BY-SA 4.0");
    assert.equal(record.source.legendRightsUrl, "https://creativecommons.org/licenses/by-sa/4.0/");
    assert.match(record.source.url, /^https:\/\//);
  }
});
