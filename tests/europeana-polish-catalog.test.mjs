import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";

const catalog = JSON.parse(
  gunzipSync(
    await readFile(new URL("../data/recognition/europeana-polish-catalog-v1.json.gz", import.meta.url)),
  ).toString("utf8"),
);

test("Europeana records without exact years retain another explicit identity signal", () => {
  assert.ok(catalog.records.length >= 1_340);
  assert.ok(catalog.stats.withoutExactYear > 0);
  for (const record of catalog.records) {
    assert.ok(record.nominal, record.id);
    assert.ok(
      record.year || record.ruler || record.mint || record.obverseLegend || record.reverseLegend,
      `weak identity record: ${record.id}`,
    );
  }
});

test("Europeana contributes CC0 metadata only and never media or catalogue prose", () => {
  for (const record of catalog.records) {
    assert.deepEqual(record.images, []);
    assert.equal(record.source.rightsCode, "factual-metadata-only");
    assert.equal(record.source.restricted, false);
    assert.match(record.source.url, /^https?:\/\//);
    assert.equal("description" in record, false);
  }
});
