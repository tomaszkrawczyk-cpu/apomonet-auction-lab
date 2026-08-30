import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";
import { localReferenceCandidates, recognitionCatalogPolicy } from "../lib/recognition-core.mjs";
import sourceRegistry from "../data/recognition/source-registry-v1.json" with { type: "json" };
import collections from "../data/research/historical-collection-index-v1.json" with { type: "json" };

const hierarchy = JSON.parse(gunzipSync(await readFile(
  new URL("../data/recognition/recognition-hierarchy-v1.json.gz", import.meta.url),
)).toString("utf8"));

test("every runtime source record belongs to the durable hierarchy", () => {
  const candidates = localReferenceCandidates();
  assert.equal(hierarchy.stats.sourceRecords, candidates.length);
  assert.equal(hierarchy.stats.specimens, candidates.length);
  assert.equal(Object.keys(hierarchy.recordMap).length, candidates.length);
  assert.equal(recognitionCatalogPolicy.hierarchySpecimenCount, candidates.length);
  for (const record of candidates) {
    assert.match(record.coinTypeId, /^type_[a-f0-9]{16}$/);
    assert.match(record.issueId, /^issue_[a-f0-9]{16}$/);
    assert.match(record.varietyId, /^variety_[a-f0-9]{16}$/);
    assert.match(record.specimenId, /^specimen_[a-f0-9]{16}$/);
    assert.equal(hierarchy.recordMap[record.id].specimenId, record.specimenId);
  }
});

test("hierarchy parent references are complete and unique", () => {
  const typeIds = new Set(hierarchy.coinTypes.map((node) => node.id));
  const issueIds = new Set(hierarchy.issues.map((node) => node.id));
  const varietyIds = new Set(hierarchy.varieties.map((node) => node.id));
  const specimenIds = new Set(hierarchy.specimens.map((node) => node.id));
  assert.equal(typeIds.size, hierarchy.coinTypes.length);
  assert.equal(issueIds.size, hierarchy.issues.length);
  assert.equal(varietyIds.size, hierarchy.varieties.length);
  assert.equal(specimenIds.size, hierarchy.specimens.length);
  for (const issue of hierarchy.issues) assert.ok(typeIds.has(issue.coinTypeId));
  for (const variety of hierarchy.varieties) {
    assert.ok(typeIds.has(variety.coinTypeId));
    assert.ok(issueIds.has(variety.issueId));
  }
  for (const specimen of hierarchy.specimens) {
    assert.ok(typeIds.has(specimen.coinTypeId));
    assert.ok(issueIds.has(specimen.issueId));
    assert.ok(varietyIds.has(specimen.varietyId));
  }
  assert.equal(hierarchy.stats.coinTypes, typeIds.size);
  assert.equal(hierarchy.stats.issues, issueIds.size);
  assert.equal(hierarchy.stats.varieties, varietyIds.size);
  assert.ok(hierarchy.stats.multiSourceIssues >= 390);
});

test("micro die differences do not automatically create catalogue varieties", () => {
  assert.match(hierarchy.policy.variety, /explicit variant\/pattern\/strike/);
  assert.match(hierarchy.policy.variety, /fingerprints until independently verified/);
  assert.ok(hierarchy.stats.reviewFlaggedCoinTypes > 0);
  assert.ok(hierarchy.coinTypes.some((node) => node.reviewFlags.includes("medieval-type-discriminator-missing")));
});

test("distinct PRL pattern designs are separate types while specimens stay below them", () => {
  const tree = hierarchy.recordMap["pattern-open:b426de23861fb58c"];
  const woman = hierarchy.recordMap["pattern-open:d031641c2465f185"];
  assert.ok(tree && woman);
  assert.notEqual(tree.coinTypeId, woman.coinTypeId);
  assert.notEqual(tree.issueId, woman.issueId);
});

test("historical collections remain a provenance index, not positive ground truth", () => {
  assert.equal(collections.stats.indexedCollectionsAndHoard, 9);
  assert.equal(collections.stats.historicalAuctionCatalogues, 5);
  assert.equal(collections.stats.runtimePositiveRecordsAddedDirectly, 0);
  assert.equal(collections.knownSpecimenLinks.length, 3);
  assert.ok(collections.knownSpecimenLinks.every((edge) => edge.status === "CATALOGUE_CHAIN_CORROBORATED"));
  assert.ok(collections.knownSpecimenLinks.every((edge) => edge.exactSpecimenMatch === false));
  assert.ok(collections.knownSpecimenLinks.every((edge) => edge.runtimeIdentity === false));
  assert.equal(collections.stats.typeLevelRuntimeLinks, 1);
  assert.equal(collections.stats.exactSpecimenLinks, 0);
  const chominski = collections.collections.find((entry) => entry.id === "collection-chominski-1932");
  const chelminski = collections.collections.find((entry) => entry.id === "collection-chelminski-1904");
  assert.notEqual(chominski.canonicalName, chelminski.canonicalName);
  assert.match(chominski.disambiguation, /Nie łączyć/);
  const source = sourceRegistry.sources.find((entry) => entry.id === "historical-collection-index");
  assert.equal(source.tier, "C");
  assert.match(source.identityRole, /only$/);
});

test("Karolkiewicz section ranges cover the numbered catalogue range without overlap", () => {
  const karolkiewicz = collections.collections.find((entry) => entry.id === "collection-karolkiewicz-2000");
  const covered = new Set();
  for (const section of karolkiewicz.sections) {
    const numbers = section.lots.match(/\d+/g).map(Number);
    const start = numbers[0];
    const end = numbers[1] ?? start;
    for (let lot = start; lot <= end; lot += 1) {
      assert.equal(covered.has(lot), false, `overlapping Karolkiewicz lot ${lot}`);
      covered.add(lot);
    }
  }
  assert.equal(Math.min(...covered), 2001);
  assert.equal(Math.max(...covered), 3076);
  assert.equal(covered.size, 1076);
});
