import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";
import {
  localReferenceCandidates,
  negativeVisualReferenceCandidates,
  recognitionCatalogPolicy,
} from "../lib/recognition-core.mjs";

const catalog = JSON.parse(
  gunzipSync(
    await readFile(new URL("../data/recognition/negative-visual-open-catalog-v1.json.gz", import.meta.url)),
  ).toString("utf8"),
);

test("licensed counterfeit, replica and coin-mould images form a separate negative corpus", () => {
  assert.ok(catalog.records.length >= 50);
  assert.equal(catalog.policy.purpose, "visual-negative-reference-only");
  assert.equal(catalog.policy.positiveIdentificationAllowed, false);
  assert.equal(catalog.policy.authenticityVerdictAllowed, false);
  for (const kind of ["counterfeit", "replica", "coin-mould"]) {
    assert.ok(catalog.records.some((record) => record.negativeClass === kind), `missing ${kind}`);
  }
  for (const record of catalog.records) {
    assert.equal(record.notForPositiveIdentification, true);
    assert.equal(record.source.rightsCode, "explicit-open-license");
    assert.equal(record.source.restricted, false);
    assert.match(record.image.url, /^https:\/\//);
    assert.match(record.image.filePageUrl, /^https:\/\/commons\.wikimedia\.org\//);
    assert.doesNotMatch(record.image.license, /\b(?:NC|ND)\b/i);
  }
});

test("negative images cannot leak into the positive identity catalogue", () => {
  const negative = negativeVisualReferenceCandidates();
  const positiveIds = new Set(localReferenceCandidates().map((record) => record.id));
  assert.equal(negative.length, catalog.records.length);
  assert.equal(recognitionCatalogPolicy.negativeVisualReferenceCount, negative.length);
  assert.equal(recognitionCatalogPolicy.negativeVisualPairedGroupCount, catalog.stats.pairedGroups);
  assert.ok(negative.every((record) => !positiveIds.has(record.id)));
});
