import test from "node:test";
import assert from "node:assert/strict";
import { localReferenceCandidates, recognitionCatalogPolicy } from "../lib/recognition-core.mjs";
import catalogue from "../data/recognition/historical-sale-facts-v1.json" with { type: "json" };
import sweep from "../data/research/public-domain-catalogue-sweep-v1.json" with { type: "json" };
import spink1900 from "../data/research/spink-1900-selective-extraction-v1.json" with { type: "json" };
import sourceRegistry from "../data/recognition/source-registry-v1.json" with { type: "json" };

const runtimeRecords = localReferenceCandidates().filter((record) =>
  record.id.startsWith("historical-sale-fact:"),
);

test("old sale facts enter runtime only after an institutional identity match", () => {
  assert.equal(catalogue.records.length, 3);
  assert.equal(runtimeRecords.length, 3);
  assert.equal(recognitionCatalogPolicy.historicalSaleFactRecordCount, 3);
  for (const record of runtimeRecords) {
    assert.equal(record.evidenceStatus, "CORROBORATED");
    assert.ok(record.corroborates.length >= 1);
    assert.equal(record.source.rightsCode, "factual-metadata-only");
    assert.equal(record.source.restricted, false);
    assert.deepEqual(record.images, []);
    assert.equal("price" in record, false);
    assert.equal("description" in record, false);
  }
});

test("selective Spink 1900 extraction keeps OCR leads out of runtime unless museum records corroborate them", () => {
  assert.equal(spink1900.stats.scannedPages, 707);
  assert.equal(spink1900.stats.candidatePages, 79);
  assert.equal(spink1900.stats.researchOnlyCandidates, 75);
  assert.equal(spink1900.stats.excludedNonCoinPages, 2);
  assert.equal(spink1900.stats.runtimeRecordsAdded, 1);
  assert.equal(spink1900.candidates.some((candidate) => "ocrExcerpt" in candidate), false);
  assert.equal(spink1900.candidates.some((candidate) => "image" in candidate), false);
  for (const candidate of spink1900.candidates.filter((item) => item.status === "RESEARCH_ONLY")) {
    assert.equal(candidate.runtimeEligible, false);
    assert.equal(candidate.independentSourceRequired, true);
  }
  const promotedLeaves = spink1900.candidates.filter((candidate) =>
    candidate.status === "CORROBORATED_EXISTING_TYPE",
  );
  assert.deepEqual(promotedLeaves.map((candidate) => candidate.scanLeaf), [438, 665]);
  assert.equal(new Set(promotedLeaves.map((candidate) => candidate.runtimeRecordId)).size, 1);
});

test("ambiguous OCR stays outside the positive identity catalogue", () => {
  const goldStrike = sweep.researchQueue.find((item) =>
    item.id === "lead-spink-1908-batory-gold-strike-1579",
  );
  const halfThalers = sweep.researchQueue.find((item) =>
    item.id === "lead-spink-1908-two-half-thalers-1630",
  );
  const medal = sweep.researchQueue.find((item) =>
    item.id === "excluded-spink-1908-sobieski-bowers-medal-1683",
  );
  assert.equal(goldStrike.status, "RESEARCH_ONLY");
  assert.match(goldStrike.reason, /zwykły dukat/);
  assert.equal(halfThalers.identity.nominal, "Półtalar");
  assert.equal(halfThalers.identity.quantityReported, 2);
  assert.equal(halfThalers.identity.mint, "");
  assert.equal(medal.status, "EXCLUDED_NON_COIN");
  assert.equal(runtimeRecords.some((record) => record.year === "1579"), false);
  assert.equal(runtimeRecords.some((record) => record.year === "1630"), false);
  assert.equal(runtimeRecords.some((record) => record.objectKind === "medal"), false);
});

test("rights decisions keep public-domain scans separate from In Copyright catalogues", () => {
  assert.equal(sweep.stats.openScans, 1);
  assert.equal(sweep.stats.factsOnlySources, 2);
  assert.equal(sweep.stats.inCopyrightReferenceOnlySources, 5);
  assert.equal(sweep.stats.newIndexedPolishPositionsInRestrictedCatalogues, 1_578);
  assert.equal(sweep.stats.imagesAdded, 0);
  assert.equal(sweep.selectiveExtraction.researchOnlyPages, 75);
  assert.equal(sweep.selectiveExtraction.runtimeRecordsAdded, 1);
  const open = sweep.sources.find((source) => source.id === "spink-circular-1900-commons");
  assert.equal(open.rightsDecision, "OPEN_SCAN");
  assert.match(open.rightsEvidence, /Public Domain Mark 1\.0/);
  for (const source of sweep.sources.filter((item) => item.rightsDecision === "REFERENCE_ONLY_IN_COPYRIGHT")) {
    assert.ok(source.blocked.includes("fotografie"));
    assert.ok(source.blocked.includes("opisy"));
  }
  const registry = sourceRegistry.sources.find((source) => source.id === "historical-sale-facts");
  assert.equal(registry.tier, "C");
  assert.match(registry.identityRole, /not-standalone-ground-truth/);
});

test("mint context merges the same Riga ducat across museum catalogues and old sale facts", () => {
  const ids = [
    "mnk:92168",
    "mnw:586811",
    "historical-sale-fact:spink-1908-riga-ducat-1588",
  ];
  const records = ids.map((id) => localReferenceCandidates().find((record) => record.id === id));
  assert.ok(records.every(Boolean));
  assert.equal(new Set(records.map((record) => record.coinTypeId)).size, 1);
  assert.equal(new Set(records.map((record) => record.issueId)).size, 1);
});

test("two Spink 1900 listings corroborate one Warsaw 1831 ducat type, not two new types", () => {
  const ids = [
    "mnk:88713",
    "mnw:610385",
    "historical-sale-fact:spink-1900-warsaw-ducat-1831",
  ];
  const records = ids.map((id) => localReferenceCandidates().find((record) => record.id === id));
  assert.ok(records.every(Boolean));
  assert.equal(new Set(records.map((record) => record.coinTypeId)).size, 1);
  assert.equal(new Set(records.map((record) => record.issueId)).size, 1);
  const sourcePages = spink1900.candidates.filter((candidate) =>
    candidate.runtimeRecordId === ids[2],
  );
  assert.equal(sourcePages.length, 2);
  assert.equal(catalogue.records.filter((record) => record.id === ids[2]).length, 1);
});
